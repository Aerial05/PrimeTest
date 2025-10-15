#!/usr/bin/env node
// Backfill KEYWORDS for services and packages using names/descriptions/features
// Usage examples (PowerShell):
//   node scripts/backfill-keywords.mjs --dry-run           # default, show changes only
//   node scripts/backfill-keywords.mjs --apply             # write KEYWORDS to RTDB
//   node scripts/backfill-keywords.mjs --target services   # only single services
//   node scripts/backfill-keywords.mjs --target packages   # only packages
//   node scripts/backfill-keywords.mjs --apply --overwrite # overwrite existing KEYWORDS

import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, update } from 'firebase/database';

function requireEnv(keys) {
  const missing = keys.filter((k) => !process.env[k]);
  if (missing.length) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
}

requireEnv([
  'VITE_FIREBASE_API_KEY',
  'VITE_FIREBASE_AUTH_DOMAIN',
  'VITE_FIREBASE_DATABASE_URL',
  'VITE_FIREBASE_PROJECT_ID',
  'VITE_FIREBASE_STORAGE_BUCKET',
  'VITE_FIREBASE_MESSAGING_SENDER_ID',
  'VITE_FIREBASE_APP_ID',
]);

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.VITE_FIREBASE_DATABASE_URL,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

// ---- CLI args ----
const args = new Set(process.argv.slice(2).filter(Boolean));
const getArgVal = (name, def = undefined) => {
  const prefix = `--${name}=`;
  const found = [...args].find((a) => a.startsWith(prefix));
  return found ? found.slice(prefix.length) : def;
};

const apply = args.has('--apply');
const overwrite = args.has('--overwrite');
const dryRun = args.has('--dry-run') || !apply; // default is dry-run unless --apply
const target = (getArgVal('target', 'both') || 'both').toLowerCase();
const maxKeywords = Number(getArgVal('max', '12')) || 12;

const STOP = new Set([
  'the','and','or','for','with','without','to','of','in','on','a','an','at','by','is','are','you','your','my','me','we','our','their','them',
  'from','this','that','these','those','as','be','can','could','should','would','may','might','will','shall','about','into','than','then','it','its','it\'s',
  'per','via','within','out','over','under','up','down','left','right','new','old','type','types','test','tests','service','services','package','packages',
  'clinic','laboratory','prime','medical','lab','labs','appointment','book','booking','available','availability'
]);

function tokenize(text) {
  const words = String(text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\-\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const out = [];
  for (const w of words) {
    if (w.length < 3) continue;
    if (/^[0-9\-]+$/.test(w)) continue; // skip pure numeric or dashes
    if (STOP.has(w)) continue;
    out.push(w);
  }
  return out;
}

function dedupePreserveOrder(arr) {
  const seen = new Set();
  const out = [];
  for (const v of arr) {
    const k = v.trim();
    if (!k || seen.has(k)) continue;
    seen.add(k);
    out.push(k);
  }
  return out;
}

function extractKeywords({ name, desc, features, instructions }) {
  const tokens = [
    ...tokenize(name),
    ...tokenize(desc),
    ...tokenize(features),
    ...tokenize(instructions),
  ];
  // Promote a few likely-medical terms if present by repeating (simple weighting)
  const BOOST = ['cbc','urinalysis','xray','x-ray','ultrasound','ob','ob-gyne','prenatal','fasting','sugar','glucose','cholesterol','lipid','electrolyte','kidney','liver','thyroid','hiv','hepatitis','covid','flu'];
  for (const b of BOOST) {
    if (tokens.includes(b)) tokens.push(b);
  }
  const unique = dedupePreserveOrder(tokens);
  return unique.slice(0, maxKeywords);
}

async function readPath(path) {
  const snap = await get(ref(db, path));
  if (!snap.exists()) return {};
  return snap.val() || {};
}

async function backfillCollection({ basePath, getText, keyField = 'KEYWORDS' }) {
  const data = await readPath(basePath);
  let total = 0, skipped = 0, changed = 0;
  const updates = {};

  for (const [id, rec] of Object.entries(data)) {
    total += 1;
    const existing = rec?.[keyField];
    const hasExisting = Array.isArray(existing) ? existing.length > 0 : (typeof existing === 'string' && existing.trim() !== '');
    if (hasExisting && !overwrite) { skipped += 1; continue; }

    const { name, desc, features, instructions } = getText(rec);
    const kws = extractKeywords({ name, desc, features, instructions });
    if (!kws.length) { skipped += 1; continue; }

    // store as array for structure; ChatbotService supports arrays
    updates[`${basePath}/${id}/${keyField}`] = kws;
    changed += 1;
  }

  if (!changed) {
    return { total, skipped, changed, applied: 0 };
  }

  if (dryRun) {
    console.log(`[DRY RUN] ${basePath}: would update ${changed}/${total}; skipped ${skipped}.`);
    // print a few samples
    let shown = 0;
    for (const [k, v] of Object.entries(updates)) {
      console.log(' -', k, '=>', v.join(', '));
      if (++shown >= 10) break;
    }
    return { total, skipped, changed, applied: 0 };
  } else {
    // RTDB multi-location update
    await update(ref(db), updates);
    console.log(`[APPLIED] ${basePath}: updated ${changed}/${total}; skipped ${skipped}.`);
    return { total, skipped, changed, applied: changed };
  }
}

async function main() {
  const doServices = target === 'services' || target === 'both';
  const doPackages = target === 'packages' || target === 'both';

  const results = [];
  if (doServices) {
    results.push(await backfillCollection({
      basePath: 'singleServices',
      getText: (rec) => ({
        name: rec?.NAME || rec?.ServiceName || '',
        desc: rec?.DESC || '',
        features: '',
        instructions: rec?.SPECIAL_INSTRUCTIONS || '',
      }),
    }));
  }

  if (doPackages) {
    results.push(await backfillCollection({
      basePath: 'servicePackages',
      getText: (rec) => ({
        name: rec?.NAME || '',
        desc: rec?.DESC || '',
        features: rec?.FEATURES || '',
        instructions: rec?.SPECIAL_INSTRUCTION || '',
      }),
    }));
  }

  const applied = results.reduce((a, r) => a + (r?.applied || 0), 0);
  const changed = results.reduce((a, r) => a + (r?.changed || 0), 0);
  const skipped = results.reduce((a, r) => a + (r?.skipped || 0), 0);
  const total = results.reduce((a, r) => a + (r?.total || 0), 0);

  console.log(`\nSummary: total=${total}, changed=${changed}, applied=${applied}, skipped=${skipped}.`);
  if (dryRun) {
    console.log('Run with --apply to write changes. Use --overwrite to replace existing KEYWORDS.');
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
