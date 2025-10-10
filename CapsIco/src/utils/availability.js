// Shared availability utilities: parse standardized spec and compute slots per date

// Day abbreviations and mapping
const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function pad(n) { return String(n).padStart(2, '0'); }
export function minutesFromHHMM(hhmm) { const [h, m] = String(hhmm).split(':').map(Number); return (Number.isFinite(h) ? h : 0) * 60 + (Number.isFinite(m) ? m : 0); }
export function toHHMM(mins) { const h = Math.floor(mins / 60), m = mins % 60; return `${pad(h)}:${pad(m)}`; }

// Parses segments like produced by AvailabilityBuilder:
// - "Daily HH:mm-HH:mm"
// - "Mon HH:mm-HH:mm"
// - "Mon-Fri HH:mm-HH:mm"
export function parseAvailabilitySegments(spec) {
  const out = [];
  if (!spec) return out;
  const parts = String(spec).split(/;|\n/).map(s => s.trim()).filter(Boolean);
  // Accept either HH:mm or HH hour-only; normalize hour-only to HH:00
  const time = '((?:[01]\\d|2[0-3]):[0-5]\\d|[01]?\\d|2[0-3])';
  const reDaily  = new RegExp(`^Daily\\s+${time}-${time}$`, 'i');
  const reSingle = new RegExp(`^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)\\s+${time}-${time}$`, 'i');
  const reRange  = new RegExp(`^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)-(Sun|Mon|Tue|Wed|Thu|Fri|Sat)\\s+${time}-${time}$`, 'i');
  const norm = (tok) => (tok.includes(':') ? tok : `${pad(Number(tok))}:00`);
  for (const p of parts) {
    let m;
    if ((m = p.match(reDaily))) { out.push({ kind: 'daily', start: norm(m[1]), end: norm(m[2]) }); continue; }
    if ((m = p.match(reRange))) { out.push({ kind: 'range', from: cap(m[1]), to: cap(m[2]), start: norm(m[3]), end: norm(m[4]) }); continue; }
    if ((m = p.match(reSingle))) { out.push({ kind: 'single', day: cap(m[1]), start: norm(m[2]), end: norm(m[3]) }); continue; }
  }
  return out;
}

function cap(s) { return s ? s[0].toUpperCase() + s.slice(1,3).toLowerCase() : s; }

// Build a map of dayIndex (0-6) -> array of [startMin, endMin]
export function buildDayIntervalsMap(spec) {
  const segs = parseAvailabilitySegments(spec);
  const map = new Map(); // dayIndex -> [[start,end], ...]
  const push = (dayIdx, s, e) => {
    const start = minutesFromHHMM(s);
    const end = minutesFromHHMM(e);
    if (!(Number.isFinite(start) && Number.isFinite(end) && end > start)) return;
    const arr = map.get(dayIdx) || [];
    arr.push([start, end]);
    map.set(dayIdx, arr);
  };
  const daily = segs.filter(s => s.kind === 'daily');
  const singles = segs.filter(s => s.kind === 'single');
  const ranges = segs.filter(s => s.kind === 'range');

  // Apply daily to all days
  if (daily.length) {
    for (let d = 0; d < 7; d++) {
      for (const seg of daily) push(d, seg.start, seg.end);
    }
  }
  // Apply singles
  for (const seg of singles) {
    const idx = DAYS.indexOf(seg.day);
    if (idx >= 0) push(idx, seg.start, seg.end);
  }
  // Apply ranges (wrap-around supported)
  for (const seg of ranges) {
    const fromIdx = DAYS.indexOf(seg.from);
    const toIdx = DAYS.indexOf(seg.to);
    if (fromIdx < 0 || toIdx < 0) continue;
    let i = fromIdx;
    for (;;) {
      push(i, seg.start, seg.end);
      if (i === toIdx) break;
      i = (i + 1) % 7;
    }
  }
  // Normalize: sort and merge overlaps per day
  for (const [k, arr] of map) {
    arr.sort((a,b) => a[0] - b[0]);
    const merged = [];
    for (const [s, e] of arr) {
      if (!merged.length || s > merged[merged.length - 1][1]) merged.push([s, e]);
      else merged[merged.length - 1][1] = Math.max(merged[merged.length - 1][1], e);
    }
    map.set(k, merged);
  }
  return map;
}

// Legacy AM/PM fallback e.g., "7:00 AM - 7:00 PM" or "Regular Schedule: 7:00 AM - 7:00 PM" or "Sun 9:00 AM - 2:00 PM"
function extractLegacyRange(availRaw, dow) {
  const parseTime = (s) => {
    const m = String(s).match(/(1[0-2]|0?[1-9]):([0-5][0-9])\s*(am|pm)/i);
    if (!m) return null;
    let h = parseInt(m[1], 10);
    const mins = parseInt(m[2], 10);
    const ampm = m[3].toLowerCase();
    if (ampm === 'pm' && h !== 12) h += 12;
    if (ampm === 'am' && h === 12) h = 0;
    return toHHMM(h * 60 + mins);
  };
  // Day specific first
  try {
    const dayName = DAYS[dow];
    const reDay = new RegExp(`${dayName}(?:day)?[^\n\r\d]*((?:1[0-2]|0?[1-9]):[0-5]\d\s*[ap]m)\s*-\s*((?:1[0-2]|0?[1-9]):[0-5]\d\s*[ap]m)`, 'i');
    const mDay = String(availRaw).match(reDay);
    if (mDay) {
      const s = parseTime(mDay[1]);
      const e = parseTime(mDay[2]);
      if (s && e) return [[minutesFromHHMM(s), minutesFromHHMM(e)]];
    }
  } catch (_) {}
  // Global range
  const m = String(availRaw).match(/((?:1[0-2]|0?[1-9]):[0-5]\d\s*[ap]m)\s*-\s*((?:1[0-2]|0?[1-9]):[0-5]\d\s*[ap]m)/i);
  if (m) {
    const s = parseTime(m[1]);
    const e = parseTime(m[2]);
    if (s && e) return [[minutesFromHHMM(s), minutesFromHHMM(e)]];
  }
  // Regular schedule syntax
  const r = String(availRaw).match(/regular[^\d]*((?:1[0-2]|0?[1-9]):[0-5]\d\s*[ap]m)\s*-\s*((?:1[0-2]|0?[1-9]):[0-5]\d\s*[ap]m)/i);
  if (r) {
    const s = parseTime(r[1]);
    const e = parseTime(r[2]);
    if (s && e) return [[minutesFromHHMM(s), minutesFromHHMM(e)]];
  }
  return null;
}

// Compute timeslots (HH:mm) for a given date string (YYYY-MM-DD)
export function computeSlotsForDateFromSpec(availSpec, dateStr, step = 30, fallbackDefault = { start: '07:00', end: '19:00' }) {
  if (!dateStr) return [];
  const d = new Date(`${dateStr}T00:00:00`);
  const dow = d.getDay(); // 0=Sun ... 6=Sat
  const segs = parseAvailabilitySegments(availSpec);

  let intervals = [];
  if (segs.length > 0) {
    // Standardized format
    const map = buildDayIntervalsMap(availSpec);
    intervals = map.get(dow) || [];
    // If standardized format present but yields no intervals for this day, return [] (closed)
  } else {
    // Legacy fallback parsing using AM/PM
    const legacy = extractLegacyRange(availSpec, dow);
    if (legacy && legacy.length) intervals = legacy;
    else {
      // Fallback defaults if nothing specified
      intervals = [[minutesFromHHMM(fallbackDefault.start), minutesFromHHMM(fallbackDefault.end)]];
    }
  }

  const times = [];
  for (const [s, e] of intervals) {
    for (let t = s; t < e; t += step) times.push(toHHMM(t));
  }
  return Array.from(new Set(times)); // de-dup if overlapping
}

export default {
  DAYS,
  parseAvailabilitySegments,
  buildDayIntervalsMap,
  computeSlotsForDateFromSpec,
  minutesFromHHMM,
  toHHMM,
};
