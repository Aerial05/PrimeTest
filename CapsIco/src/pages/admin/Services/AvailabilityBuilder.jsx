import React, { useMemo, useState } from 'react';

const DAY_OPTS = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];

function toHHmm(value) {
  if (!value) return '';
  // Accept both HH:mm and H:mm
  const m = String(value).match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return '';
  const h = Math.max(0, Math.min(23, parseInt(m[1], 10)));
  const mm = Math.max(0, Math.min(59, parseInt(m[2], 10)));
  return `${String(h).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
}

function parseSegments(value) {
  const out = [];
  if (!value) return out;
  const parts = String(value).split(/;|\n/).map(s => s.trim()).filter(Boolean);
  const time = '([01]\\d|2[0-3]):[0-5]\\d';
  const reDaily = new RegExp(`^Daily\\s+${time}-${time}$`);
  const reRange = new RegExp(`^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)-(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\\s+${time}-${time}$`);
  const reSingle = new RegExp(`^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\\s+${time}-${time}$`);
  for (const p of parts) {
    let m;
    if ((m = p.match(reDaily))) {
      out.push({ kind: 'daily', start: m[1], end: m[2] });
      continue;
    }
    if ((m = p.match(reRange))) {
      out.push({ kind: 'range', from: m[1], to: m[2], start: m[3], end: m[4] });
      continue;
    }
    if ((m = p.match(reSingle))) {
      out.push({ kind: 'single', day: m[1], start: m[2], end: m[3] });
      continue;
    }
  }
  return out;
}

function buildString(segments) {
  const segs = segments.map(s => {
    if (s.kind === 'daily' && s.start && s.end) return `Daily ${s.start}-${s.end}`;
    if (s.kind === 'single' && s.day && s.start && s.end) return `${s.day} ${s.start}-${s.end}`;
    if (s.kind === 'range' && s.from && s.to && s.start && s.end) return `${s.from}-${s.to} ${s.start}-${s.end}`;
    return null;
  }).filter(Boolean);
  return segs.join('; ');
}

export default function AvailabilityBuilder({ value, onChange, disabled }) {
  const [kind, setKind] = useState('daily'); // 'daily' | 'single' | 'range'
  const [day, setDay] = useState('Mon');
  const [from, setFrom] = useState('Mon');
  const [to, setTo] = useState('Fri');
  const [start, setStart] = useState('07:00');
  const [end, setEnd] = useState('16:00');

  const segments = useMemo(() => parseSegments(value), [value]);

  const add = () => {
    const s = toHHmm(start);
    const e = toHHmm(end);
    if (!s || !e) return; // ignore invalid
    const next = [...segments];
    if (kind === 'daily') next.push({ kind: 'daily', start: s, end: e });
    else if (kind === 'single') next.push({ kind: 'single', day, start: s, end: e });
    else next.push({ kind: 'range', from, to, start: s, end: e });
    onChange && onChange(buildString(next));
  };

  const remove = (idx) => {
    const next = segments.filter((_, i) => i !== idx);
    onChange && onChange(buildString(next));
  };

  const clearAll = () => onChange && onChange('');

  const disabledStyle = disabled ? { opacity: 0.6, pointerEvents: 'none' } : undefined;

  return (
    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 8, marginTop: 8, background: '#f9fafb' }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', ...disabledStyle }}>
        <label style={{ fontSize: 12, fontWeight: 700, color: '#374151' }}>Build availability:</label>
        <select value={kind} onChange={(e)=>setKind(e.target.value)} style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid #d1d5db' }}>
          <option value="daily">Daily</option>
          <option value="single">Single day</option>
          <option value="range">Day range</option>
        </select>
        {kind === 'single' && (
          <select value={day} onChange={(e)=>setDay(e.target.value)} style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid #d1d5db' }}>
            {DAY_OPTS.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
        )}
        {kind === 'range' && (
          <>
            <select value={from} onChange={(e)=>setFrom(e.target.value)} style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid #d1d5db' }}>
              {DAY_OPTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <span style={{ fontSize: 12, color: '#6b7280' }}>to</span>
            <select value={to} onChange={(e)=>setTo(e.target.value)} style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid #d1d5db' }}>
              {DAY_OPTS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </>
        )}
        <input type="time" value={start} onChange={(e)=>setStart(e.target.value)} style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid #d1d5db' }} />
        <span style={{ fontSize: 12, color: '#6b7280' }}>-</span>
        <input type="time" value={end} onChange={(e)=>setEnd(e.target.value)} style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid #d1d5db' }} />
        <button type="button" onClick={add} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #c7d2fe', background: '#eef2ff', color: '#1e3a8a', fontWeight: 800 }}>Add</button>
        <button type="button" onClick={clearAll} style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#334155', fontWeight: 700 }}>Clear</button>
      </div>
      {segments.length > 0 && (
        <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {segments.map((s, i) => (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '4px 8px', borderRadius: 999, background: '#fff', border: '1px solid #e5e7eb', fontSize: 12 }}>
              {s.kind === 'daily' ? `Daily ${s.start}-${s.end}` : s.kind === 'single' ? `${s.day} ${s.start}-${s.end}` : `${s.from}-${s.to} ${s.start}-${s.end}`}
              <button type="button" onClick={()=>remove(i)} title="Remove" style={{ background: 'transparent', border: 0, color: '#ef4444', cursor: 'pointer' }}>×</button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
