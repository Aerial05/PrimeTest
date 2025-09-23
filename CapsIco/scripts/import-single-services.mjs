#!/usr/bin/env node
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import { fileURLToPath } from 'url';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, push, set, get, update } from 'firebase/database';

// Ensure Vite envs are available when running Node (expects .env file)
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

function toDbRecord(row) {
  // 1) Normalize header keys (trim + strip BOM) and apply a mapping layer to unify variants
  const raw = {};
  for (const [rawKey, rawVal] of Object.entries(row)) {
    const key = String(rawKey).replace(/^\uFEFF/, '').trim();
    raw[key] = rawVal;
  }

  // Header mapping to canonical DB keys for single services
  const keyMap = {
    'IS_ACTIVE(Yes/No)': 'IS_ACTIVE_YesNo',
    'PRICE_NOTE (If no price)': 'PRICE_NOTE',
    'PRICE_NOTE(If no price)': 'PRICE_NOTE',
    'PRICE NOTE (If no price)': 'PRICE_NOTE',
    'PRICE NOTE': 'PRICE_NOTE',
    'ORIGINAL_RPICE': 'ORIGINAL_PRICE',
    'ORIGINAL PRICE': 'ORIGINAL_PRICE',
    'DISCOUNTED PRICE': 'DISCOUNTED_PRICE',
    // common typo in sample: DICOUNTED_PRICE
    'DICOUNTED_PRICE': 'DISCOUNTED_PRICE',
    'DICOUNTED PRICE': 'DISCOUNTED_PRICE',
    'PHILHEALTH_PROMO_PRICE': 'PHIL_HEALTH_PROMO_PRICE',
    'PHILHEALTH PROMO PRICE': 'PHIL_HEALTH_PROMO_PRICE',
    'SERVICE_ID': 'SERVICE_ID',
    'Service_ID': 'SERVICE_ID',
  };

  const rec = {};
  for (const [k, v] of Object.entries(raw)) {
    const mapped = Object.prototype.hasOwnProperty.call(keyMap, k) ? keyMap[k] : k;
    rec[mapped] = v;
  }

  // 2) Normalize string values, blanks -> undefined
  for (const k of Object.keys(rec)) {
    if (typeof rec[k] === 'string') {
      rec[k] = rec[k].trim();
    }
    if (rec[k] === '' || rec[k] === ' ') rec[k] = undefined;
  }

  // 3) Normalize numeric fields on canonical keys
  const numericKeys = ['SLOT', 'DUR_MINUTE', 'ORIGINAL_PRICE', 'DISCOUNTED_PRICE', 'PHIL_HEALTH_PROMO_PRICE'];
  for (const k of numericKeys) {
    if (rec[k] !== undefined && rec[k] !== null && rec[k] !== '') {
      const val = String(rec[k]).replace(/[^0-9.\-]/g, '');
      rec[k] = val === '' ? undefined : Number(val);
    }
  }

  // 4) Availability: expand REGULAR shorthand
  if (rec['AVAILABILITY'] && String(rec['AVAILABILITY']).toUpperCase() === 'REGULAR') {
    rec['AVAILABILITY'] = 'Regular Schedule : Mon-Sat 7:00 AM - 4:00 PM (3:30 PM cutoff). Sunday 7:30 AM - 11:30 AM.';
  }

  // 5) Normalize yes/no on sanitized keys
  const yesNoKeys = ['IS_ACTIVE_YesNo'];
  for (const k of yesNoKeys) {
    if (rec[k] !== undefined) {
      const v = String(rec[k]).trim().toLowerCase();
      rec[k] = v === 'yes' ? 'Yes' : v === 'no' ? 'No' : rec[k];
    }
  }

  // 6) Timestamps: set sensible defaults
  const now = new Date().toISOString();
  if (!rec['CREATED_AT']) rec['CREATED_AT'] = now;
  if (!rec['UPDATED_AT']) rec['UPDATED_AT'] = now;
  if (!rec['ARCHIVED_AT']) {
    const activeVal = rec['IS_ACTIVE_YesNo'];
    rec['ARCHIVED_AT'] = activeVal === 'No' ? now : '';
  }

  // 7) Remove undefined (RTDB rejects undefined values)
  Object.keys(rec).forEach((k) => {
    if (rec[k] === undefined) delete rec[k];
  });

  return rec;
}

async function main() {
  const csvArg = process.argv[2];
  if (!csvArg) {
    console.error('Usage: node scripts/import-single-services.mjs <path-to-csv>');
    process.exit(1);
  }
  const csvPath = path.isAbsolute(csvArg) ? csvArg : path.join(process.cwd(), csvArg);
  if (!fs.existsSync(csvPath)) {
    console.error(`CSV file not found: ${csvPath}`);
    process.exit(1);
  }

  const content = fs.readFileSync(csvPath, 'utf8');
  const records = parse(content, {
    columns: true,
    skip_empty_lines: true,
  });

  const basePath = 'singleServices';
  let created = 0;
  let updatedCount = 0;
  let failed = 0;

  // Prefetch all existing single services and build a map by SERVICE_ID -> dbKey
  const existingSnap = await get(ref(db, basePath));
  const idToKey = new Map();
  if (existingSnap.exists()) {
    const obj = existingSnap.val() || {};
    for (const [key, val] of Object.entries(obj)) {
      const sid = val && (val.SERVICE_ID || val['Service_ID']);
      if (sid) idToKey.set(String(sid).trim(), key);
    }
  }

  for (const row of records) {
    try {
      const rec = toDbRecord(row);
      const serviceId = rec['SERVICE_ID'] && String(rec['SERVICE_ID']).trim();
      if (serviceId && idToKey.has(serviceId)) {
        const key = idToKey.get(serviceId);
        await update(ref(db, `${basePath}/${key}`), rec);
        updatedCount += 1;
      } else {
        const newRef = push(ref(db, basePath));
        if (!serviceId) rec['SERVICE_ID'] = `SP-${newRef.key}`;
        await set(newRef, rec);
        created += 1;
        idToKey.set(rec['SERVICE_ID'], newRef.key);
      }
    } catch (err) {
      failed += 1;
      console.error('Failed to import row:', row, err.message);
    }
  }

  console.log(`Import finished. Created: ${created}, Updated: ${updatedCount}, Failed: ${failed}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
