import React, { useEffect, useMemo, useState, useDeferredValue, useTransition } from 'react';
import styles from './ChartsSection.module.css';
import { ChartCard } from '../chartCard/ChartCard';
import { onValue, ref as dbRef } from 'firebase/database';
import { usersDB } from '../../../../config/firebase-config';
import singleServicesService from '../../../../services/SingleServicesService';
import servicePackagesService from '../../../../services/ServicePackagesService';
import authService from '../../../../services/AuthService';

const ranges = ["Last 7 Days", "Last 30 Days"]; 
const serviceFilters = ["All Services", "Single-Service", "Package Service"]; // include All Services option
const monthNames = [
  'January','February','March','April','May','June','July','August','September','October','November','December'
];
// To keep the DOM light when showing all-time most used services
const MAX_SERVICE_BARS = 40; // top 39 + Others

function toISOdateOnly(d) { try { return new Date(d).toISOString().slice(0,10); } catch(_) { return null; } }
function tryParseDateString(s){
  if(!s) return null;
  try{ const iso = new Date(s).toISOString().slice(0,10); return iso; }catch(_){/* noop */}
  const parts = String(s).replace(/\s+/g,'').split(/[\/-]/);
  if(parts.length===3){
    const [a,b,c] = parts.map(p=>parseInt(p,10));
    if(!isNaN(a)&&!isNaN(b)&&!isNaN(c)){
      const year = c>31?c:(a>31?a:(b>31?b:c));
      if(String(year).length===4){
        const rest=[a,b,c].filter(x=>x!==year);
        const m = rest.find(x=>x>=1 && x<=12) || 1;
        const d = rest.find(x=>x!==m) || 1;
        const dt = new Date(year, m-1, d);
        if(!isNaN(dt.getTime())) return dt.toISOString().slice(0,10);
      }
    }
  }
  return null;
}
function daysBack(n) { const d = new Date(); d.setDate(d.getDate() - n); return d; }
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function normalizeService(raw) {
  const s = String(raw || '').toLowerCase();
  // Unify x-ray variants, ultrasound, ob-gyne, ecg
  if (s.includes('ultra')) return 'Ultrasound';
  if (s.includes('ob') || s.includes('gyne') || s.includes('ob-gyn') || s.includes('ob‑gyne')) return 'OB-Gyne';
  if (s.includes('ecg')) return 'ECG';
  if (s.includes('lab') || s.includes('laboratory')) return 'Laboratory';
  return raw || 'Other';
}

function SvgBarsBase({ data, color = '#2563eb', showValues = false, rotateLabels = true, labelMaxLen = 12, labelFontSize = 10, forceAllLabels = false }) {
  // Use a larger virtual width and height; render responsive to container width
  const width = 960, height = 280, pad = 40;
  const ys = data.map(d => d.value);
  const max = Math.max(1, ...ys);
  const bw = (width - pad*2) / Math.max(1, data.length);
  // Thin x-axis labels to avoid overlap on larger ranges
  const tickEvery = (forceAllLabels && data.length <= 40)
    ? 1
    : (data.length > 100 ? 12 : data.length > 60 ? 10 : data.length > 28 ? 5 : 1);
  const wrapLabel = (s, maxLen = 18, maxLines = 3) => {
    const words = String(s || '').split(/\s+/);
    let cur = '';
    const lines = [];
    for (const w of words) {
      if ((cur + ' ' + w).trim().length <= maxLen) {
        cur = (cur ? cur + ' ' : '') + w;
      } else {
        if (cur) lines.push(cur);
        cur = w;
        if (lines.length >= maxLines - 1) {
          // push the rest into the last line and break
          break;
        }
      }
    }
    if (cur) lines.push(cur);
    return lines.slice(0, maxLines);
  };
  const truncate = (s) => {
    const str = String(s || '');
    return str.length > labelMaxLen ? str.slice(0, Math.max(1,labelMaxLen-1)) + '…' : str;
  };
  return (
    <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
      <defs>
        <linearGradient id="barGrad" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#60a5fa"/>
          <stop offset="100%" stopColor="#6366f1"/>
        </linearGradient>
      </defs>
      {/* baseline grid */}
  <line x1={pad} y1={height - pad - 10} x2={width - pad} y2={height - pad - 10} stroke="#e2e8f0" strokeWidth="1"/>
      {data.map((d, i) => {
        const h = (d.value / max) * (height - pad*2);
        const x = pad + i * bw + 6;
  const y = height - pad - 10 - h;
        return (
          <g key={i}>
            <rect x={x} y={y} width={bw - 12} height={clamp(h,0,height)} rx={6} fill="url(#barGrad)" aria-label={`${d.label}: ${d.value}`}>
              <title>{`${d.label} — ${d.value}`}</title>
            </rect>
            {showValues && data.length <= 60 && d.value > 0 ? (
              <text x={x + (bw - 12)/2} y={y - 6} fontSize="11" textAnchor="middle" fill="#334155" fontWeight="700">{d.value}</text>
            ) : null}
          </g>
        )
      })}
      {data.map((d, i) => {
        const x = pad + i * bw + bw/2;
        const showLabel = (i % tickEvery === 0) || (i === data.length - 1);
        if (!showLabel) return null;
        if (rotateLabels) {
          const angle = data.length > 14 ? -35 : -20;
          const baseY = height - 29; // lift labels to avoid overlapping legend below
          const lines = wrapLabel(d.label, 22, 3);
          return (
            <text key={`t${i}`} x={x} y={baseY} fontSize={labelFontSize} textAnchor="end" fill="#475569" transform={`rotate(${angle} ${x},${baseY})`}>
              {lines.map((ln, idx) => (
                <tspan key={idx} x={x} dy={idx === 0 ? 0 : 12}>{ln}</tspan>
              ))}
              <title>{d.label}</title>
            </text>
          );
        }
        return (
          <text key={`t${i}`} x={x} y={height - 8} fontSize={labelFontSize} textAnchor="middle" fill="#0f172a" fontWeight="600">
            {truncate(d.label)}
            <title>{d.label}</title>
          </text>
        );
      })}
    </svg>
  );
}

// Memoize to skip re-rendering when data and relevant props are unchanged
const SvgBars = React.memo(SvgBarsBase, (prev, next) => {
  if (prev.rotateLabels !== next.rotateLabels) return false;
  if (prev.showValues !== next.showValues) return false;
  if (prev.labelFontSize !== next.labelFontSize) return false;
  if (prev.labelMaxLen !== next.labelMaxLen) return false;
  if (prev.forceAllLabels !== next.forceAllLabels) return false;
  const a = prev.data || [];
  const b = next.data || [];
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i].label !== b[i].label || a[i].value !== b[i].value) return false;
  }
  return true;
});

export function ChartsSection() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState([]);
  const [range, setRange] = useState(ranges[0]);
  const nowRef = new Date();
  const [selMonth, setSelMonth] = useState(nowRef.getMonth()); // 0-11
  const [selYear, setSelYear] = useState(nowRef.getFullYear());
  const [monthMode, setMonthMode] = useState(false);
  const [trendStatus, setTrendStatus] = useState('all'); // 'all' | 'success' | 'scheduled'
  const [trendRescope, setTrendRescope] = useState('all'); // 'all' | 'only' | 'exclude'
  const [trendSvcType, setTrendSvcType] = useState(serviceFilters[0]);
  const [svcFilter, setSvcFilter] = useState(serviceFilters[0]);
  const [singleNameById, setSingleNameById] = useState({});
  const [packageNameById, setPackageNameById] = useState({});
  // Most Used Services now uses a monthly view only with a type filter
  const [svcSelMonth, setSvcSelMonth] = useState(nowRef.getMonth());
  const [svcSelYear, setSvcSelYear] = useState(nowRef.getFullYear());
  const [svcTotalMode, setSvcTotalMode] = useState(false); // All-time aggregation toggle
  // Shared custom date range (affects both charts when both dates are set)
  const [customFrom, setCustomFrom] = useState(''); // YYYY-MM-DD
  const [customTo, setCustomTo] = useState('');     // YYYY-MM-DD
  const customActive = useMemo(() => Boolean(customFrom && customTo && customFrom <= customTo), [customFrom, customTo]);
  const [isPending, startTransition] = useTransition();
  const rowsDeferred = useDeferredValue(rows);
  const storageKey = `adminDashboard:chartsFilters:${authService.currentUser?.uid || 'anon'}`;

  // Load saved filters for this admin from localStorage on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved) {
        if (typeof saved.range === 'string' && ranges.includes(saved.range)) setRange(saved.range);
        if (typeof saved.selMonth === 'number' && saved.selMonth >= 0 && saved.selMonth <= 11) setSelMonth(saved.selMonth);
        if (typeof saved.selYear === 'number') setSelYear(saved.selYear);
        if (typeof saved.monthMode === 'boolean') setMonthMode(saved.monthMode);
        if (typeof saved.trendStatus === 'string') setTrendStatus(saved.trendStatus);
  if (typeof saved.trendRescope === 'string') setTrendRescope(saved.trendRescope);
        if (typeof saved.trendSvcType === 'string' && serviceFilters.includes(saved.trendSvcType)) setTrendSvcType(saved.trendSvcType);
        if (typeof saved.svcFilter === 'string' && serviceFilters.includes(saved.svcFilter)) setSvcFilter(saved.svcFilter);
        if (typeof saved.svcSelMonth === 'number' && saved.svcSelMonth >= 0 && saved.svcSelMonth <= 11) setSvcSelMonth(saved.svcSelMonth);
        if (typeof saved.svcSelYear === 'number') setSvcSelYear(saved.svcSelYear);
        if (typeof saved.svcTotalMode === 'boolean') setSvcTotalMode(saved.svcTotalMode);
        if (typeof saved.customFrom === 'string') setCustomFrom(saved.customFrom);
        if (typeof saved.customTo === 'string') setCustomTo(saved.customTo);
      }
    } catch (_) { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist filters whenever they change
  useEffect(() => {
    try {
      const data = {
        range, selMonth, selYear, monthMode, trendStatus, trendRescope, trendSvcType,
        svcFilter, svcSelMonth, svcSelYear, svcTotalMode,
        customFrom, customTo,
      };
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (_) { /* ignore */ }
  }, [storageKey, range, selMonth, selYear, monthMode, trendStatus, trendRescope, trendSvcType, svcFilter, svcSelMonth, svcSelYear, svcTotalMode, customFrom, customTo]);
  
  

  const titleCase = (s) => String(s||'').toLowerCase().replace(/(^|\s|[-_\/])(\w)/g, (m, p1, p2) => p1 + p2.toUpperCase());

  // Simplified filters: Monthly view + Type only

  useEffect(() => {
    setLoading(true);
    const r = dbRef(usersDB, 'appointments');
    const unsub = onValue(r, (snap) => {
      const obj = snap.exists() ? (snap.val() || {}) : {};
      const arr = Object.keys(obj).map(id => ({ id, ...obj[id] }));
      setRows(arr);
      setLoading(false);
    }, () => setLoading(false));
    return () => { try { unsub && unsub(); } catch(_) {} };
  }, []);

  // Load catalogs to map SERVICE_ID -> NAME for singles and packages
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [singles, packages] = await Promise.all([
          singleServicesService.list(),
          servicePackagesService.list(),
        ]);
        if (!mounted) return;
        const sMap = {};
        (singles || []).forEach((rec) => {
          const id1 = rec.SERVICE_ID || rec['Service_ID'] || '';
          const keyCandidates = [rec.id, id1].filter(Boolean);
          keyCandidates.forEach(k => { sMap[k] = rec.NAME || rec.name || 'Unknown'; });
        });
        const pMap = {};
        (packages || []).forEach((rec) => {
          const id1 = rec.SERVICE_PACKGE_ID || rec['SERVICE_PACKAGE_ID'] || rec['Service_Package_ID'] || '';
          const keyCandidates = [rec.id, id1].filter(Boolean);
          keyCandidates.forEach(k => { pMap[k] = rec.NAME || rec.name || 'Unknown'; });
        });
        setSingleNameById(sMap);
        setPackageNameById(pMap);
      } catch(_e) {
        // ignore; maps remain empty
      }
    })();
    return () => { mounted = false; };
  }, []);

  const yearOptions = useMemo(() => {
    const ys = new Set();
    rowsDeferred.forEach(r => {
      const iso = tryParseDateString(r.DATE_OF_APPOINTMENT || r.CREATED_AT);
      if (iso) ys.add(new Date(iso).getFullYear());
    });
    if (ys.size === 0) ys.add(nowRef.getFullYear());
    return Array.from(ys).sort((a,b)=>b-a);
  }, [rowsDeferred]);

  const trendData = useMemo(() => {
    const byMonth = monthMode;
    const bucket = new Map();
    if (customActive) {
      // Prefill bucket for each day between customFrom and customTo
      const start = new Date(customFrom + 'T00:00:00');
      const end = new Date(customTo + 'T00:00:00');
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        bucket.set(toISOdateOnly(d), 0);
      }
    } else if (byMonth) {
      const start = new Date(selYear, selMonth, 1);
      const daysInMonth = new Date(selYear, selMonth + 1, 0).getDate();
      for (let i=0;i<daysInMonth;i++){
        const d = new Date(start); d.setDate(start.getDate()+i);
        bucket.set(toISOdateOnly(d), 0);
      }
    } else {
      const n = range.includes('30') ? 30 : 7;
      const start = daysBack(n-1);
      for (let i=0;i<n;i++){
        const d = new Date(start); d.setDate(start.getDate()+i);
        bucket.set(toISOdateOnly(d), 0);
      }
    }
    const statusIsSuccess = (s) => {
      const v = String(s || '').toLowerCase();
      return v === 'successful' || v === 'success' || v === 'successfull' || v === 'completed';
    };
    const statusIsScheduled = (s) => {
      const v = String(s || '').toLowerCase();
      return v === 'pending' || v === 'approved';
    };
    const statusPasses = (s) => {
      if (trendStatus === 'all') return true;
      if (trendStatus === 'success') return statusIsSuccess(s);
      if (trendStatus === 'scheduled') return statusIsScheduled(s);
      return true;
    };
    const reschedulePasses = (row) => {
      const hasRes = !!row.RESCHEDULE_INFO;
      if (trendRescope === 'only') return hasRes;
      if (trendRescope === 'exclude') return !hasRes;
      return true;
    };

    // Quick type inference for filtering by service type without relying on later helpers
    const inferTypeQuick = (row) => {
      const st = String(row.SERVICE_TYPE || row.TYPE || '').toLowerCase();
      if (st.includes('package')) return 'Package Service';
      if (st.includes('single')) return 'Single-Service';
      if (row.SERVICE_PACKGE_ID || row.SERVICE_PACKAGE_ID) return 'Package Service';
      if (row.SERVICE_ID) {
        const key = String(row.SERVICE_ID);
        if (packageNameById[key]) return 'Package Service';
        if (singleNameById[key]) return 'Single-Service';
      }
      return '';
    };
    rowsDeferred.forEach(r => {
      if (trendSvcType !== 'All Services') {
        const t = inferTypeQuick(r);
        if (!t || t !== trendSvcType) return;
      }
      if (!statusPasses(r.BOOKING_STATUS)) return;
      if (!reschedulePasses(r)) return;
      const ds = r.DATE_OF_APPOINTMENT || r.CREATED_AT;
      if (!ds) return;
      try {
        const iso = tryParseDateString(ds);
        if (!iso) return;
        if (customActive) {
          const d = new Date(iso);
          const s = new Date(customFrom + 'T00:00:00');
          const e = new Date(customTo + 'T23:59:59');
          if (d < s || d > e) return;
        }
        if (bucket.has(iso)) bucket.set(iso, bucket.get(iso)+1);
      } catch(_){/* ignore */}
    });
    const arr = Array.from(bucket.entries()).map(([k,v]) => ({ label: (monthMode && !customActive) ? String(parseInt(k.slice(8),10)) : k.slice(5), value: v }));
    return arr;
  }, [rowsDeferred, range, selMonth, selYear, monthMode, trendStatus, trendSvcType, singleNameById, packageNameById, customActive, customFrom, customTo]);

  const rangeDisplay = useMemo(() => {
    if (customActive) {
      const fmt = (d) => {
        try { return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }); } catch(_) { return d.toISOString().slice(0,10); }
      };
      return `${fmt(new Date(customFrom + 'T00:00:00'))} – ${fmt(new Date(customTo + 'T00:00:00'))}`;
    }
    if (monthMode) {
      return `${monthNames[selMonth]} ${selYear}`;
    }
    const n = range.includes('30') ? 30 : 7;
    const start = daysBack(n - 1);
    const end = new Date();
    const fmt = (d) => {
      try { return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); } catch(_) { return d.toISOString().slice(0,10); }
    };
    return `Last ${n} days (${fmt(start)} – ${fmt(end)})`;
  }, [range, selMonth, selYear, monthMode, customActive, customFrom, customTo]);

  const statusDisplay = useMemo(() => {
    if (trendStatus === 'success') return 'Success Only';
    if (trendStatus === 'scheduled') return 'Pending/Approved';
    return 'All';
  }, [trendStatus]);
  const trendTypeDisplay = useMemo(() => trendSvcType, [trendSvcType]);

  const singleNameSet = useMemo(() => new Set(Object.values(singleNameById).map(n => String(n||'').toLowerCase().trim())), [singleNameById]);
  const packageNameSet = useMemo(() => new Set(Object.values(packageNameById).map(n => String(n||'').toLowerCase().trim())), [packageNameById]);

  const inferType = (row) => {
    // Prefer explicit SERVICE_TYPE when present
    const st = String(row.SERVICE_TYPE || row.TYPE || '').toLowerCase();
    if (st.includes('package')) return 'Package Service';
    if (st.includes('single')) return 'Single-Service';
    // Fallbacks by presence of known IDs
    if (row.SERVICE_PACKGE_ID || row.SERVICE_PACKAGE_ID) return 'Package Service';
    if (row.SERVICE_ID) {
      const key = String(row.SERVICE_ID);
      if (packageNameById[key]) return 'Package Service';
      if (singleNameById[key]) return 'Single-Service';
      // If we can't resolve via catalogs, keep undecided for now
    }
    // Fallback by matching known catalog names
    const nm = String(row.SERVICE_NAME || '').toLowerCase().trim();
    if (nm) {
      const inSingle = singleNameSet.has(nm);
      const inPackage = packageNameSet.has(nm);
      if (inPackage && !inSingle) return 'Package Service';
      if (inSingle && !inPackage) return 'Single-Service';
    }
    // Unknown
    return '';
  };

  const topServices = useMemo(() => {
    const counts = new Map();
    // Monthly window for services chart
    const start = new Date(svcSelYear, svcSelMonth, 1);
    const end = new Date(svcSelYear, svcSelMonth + 1, 0, 23, 59, 59, 999);
    rowsDeferred.forEach(r => {
      // Apply time window unless all-time mode is on
      if (!svcTotalMode && !customActive) {
        // Use UPDATED_AT/DATE_OF_APPOINTMENT/CREATED_AT for bucketing
        const dateStr = r.UPDATED_AT || r.DATE_OF_APPOINTMENT || r.CREATED_AT;
        const iso = tryParseDateString(dateStr);
        if (iso) {
          const apptDate = new Date(iso);
          if (apptDate < start || apptDate > end) return;
        } else {
          // no date => cannot place in selected month window
          return;
        }
      } else if (customActive) {
        const dateStr = r.UPDATED_AT || r.DATE_OF_APPOINTMENT || r.CREATED_AT;
        const iso = tryParseDateString(dateStr);
        if (!iso) return;
        const d = new Date(iso);
        const s = new Date(customFrom + 'T00:00:00');
        const e = new Date(customTo + 'T23:59:59');
        if (d < s || d > e) return;
      }
      
      const type = inferType(r);
      if (!type) return;
      if (svcFilter && svcFilter !== 'All Services' && type !== svcFilter) return;
      let name = 'Unknown';
      if (type === 'Single-Service') {
        const sid = r.SERVICE_ID || '';
        name = singleNameById[sid] || r.SERVICE_NAME || 'Unknown';
      } else if (type === 'Package Service') {
        const pidCandidates = [r.SERVICE_PACKGE_ID, r.SERVICE_PACKAGE_ID, r.SERVICE_ID].filter(Boolean);
        for (const pid of pidCandidates) {
          if (packageNameById[pid]) { name = packageNameById[pid]; break; }
        }
        if (name === 'Unknown') name = r.SERVICE_NAME || 'Unknown';
      }
      name = String(name || '').trim() || 'Unknown';
      counts.set(name, (counts.get(name)||0)+1);
    });
    let arr = Array.from(counts.entries()).map(([label, value]) => ({ label, value }));
    // Sort by count desc
    arr.sort((a,b)=>b.value-a.value);
    // Cap bars and bucket the rest as "Others" for performance
    if (arr.length > MAX_SERVICE_BARS) {
      const kept = arr.slice(0, MAX_SERVICE_BARS - 1);
      const othersSum = arr.slice(MAX_SERVICE_BARS - 1).reduce((sum, it) => sum + it.value, 0);
      arr = [...kept, { label: 'Others', value: othersSum }];
    }
    return arr;
  }, [rowsDeferred, svcFilter, singleNameById, packageNameById, singleNameSet, packageNameSet, svcSelMonth, svcSelYear, svcTotalMode, customActive, customFrom, customTo]);

  const mostUsed = useMemo(() => {
    if (!topServices.length) return null;
    const top = topServices.reduce((acc, cur) => (cur.value > acc.value ? cur : acc), topServices[0]);
    if (!top.label || String(top.label).toLowerCase() === 'unknown') return null;
    return top;
  }, [topServices]);

  const svcRangeDisplay = useMemo(() => {
    if (customActive) {
      try {
        const fmt = (d) => d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
        return `${fmt(new Date(customFrom + 'T00:00:00'))} – ${fmt(new Date(customTo + 'T00:00:00'))}`;
      } catch (_) {
        return `${customFrom} – ${customTo}`;
      }
    }
    return svcTotalMode ? 'All time' : `${monthNames[svcSelMonth]} ${svcSelYear}`;
  }, [svcSelMonth, svcSelYear, svcTotalMode, customActive, customFrom, customTo]);

  const svcTypeDisplay = useMemo(() => (svcFilter || 'All Services'), [svcFilter]);
  const svcHasOthers = useMemo(() => topServices.some(d => d.label === 'Others'), [topServices]);
  
  // Prepare/merge a report snapshot when requested from the parent page (placed after topServices definition)
  useEffect(() => {
    const handler = () => {
      try {
        // Reconstruct the currently filtered appointment rows used by trendData bucketing
        const filteredAppointments = rowsDeferred.filter((r) => {
          // status filter
          const v = String(r.BOOKING_STATUS || '').toLowerCase();
          const isSuccess = v === 'successful' || v === 'success' || v === 'successfull' || v === 'completed';
          const isScheduled = v === 'pending' || v === 'approved';
          const statusPass = trendStatus === 'all' || (trendStatus === 'success' && isSuccess) || (trendStatus === 'scheduled' && isScheduled);
          if (!statusPass) return false;
          // type filter
          if (trendSvcType !== 'All Services') {
            const t = inferType(r);
            if (!t || t !== trendSvcType) return false;
          }
          // date window for trend: custom range OR month OR last N days
          const dateStr = r.DATE_OF_APPOINTMENT || r.CREATED_AT;
          const iso = tryParseDateString(dateStr);
          if (!iso) return false;
          const dt = new Date(iso);
          if (customActive) {
            const s = new Date(customFrom + 'T00:00:00');
            const e = new Date(customTo + 'T23:59:59');
            return dt >= s && dt <= e;
          } else if (monthMode) {
            const start = new Date(selYear, selMonth, 1);
            const end = new Date(selYear, selMonth + 1, 0, 23, 59, 59, 999);
            return dt >= start && dt <= end;
          } else {
            const n = range.includes('30') ? 30 : 7;
            const start = daysBack(n - 1);
            const end = new Date();
            const d0 = new Date(start.getFullYear(), start.getMonth(), start.getDate());
            const d1 = new Date(end.getFullYear(), end.getMonth(), end.getDate(), 23, 59, 59, 999);
            return dt >= d0 && dt <= d1;
          }
        });

        let prev = {};
        try { prev = JSON.parse(sessionStorage.getItem('adminDashboardReportSnapshot') || '{}'); } catch(_) {}
        const merged = {
          ...prev,
          capturedAt: prev.capturedAt || new Date().toISOString(),
          appointmentFilters: { monthMode, range, selMonth, selYear, trendStatus, trendRescope, trendSvcType, customFrom, customTo },
          appointments: filteredAppointments,
          mostUsedFilters: { svcTotalMode, svcFilter, svcSelMonth, svcSelYear, customFrom, customTo },
          mostUsed: topServices,
        };
        sessionStorage.setItem('adminDashboardReportSnapshot', JSON.stringify(merged));
      } catch(_) {
        // ignore
      }
    };
    window.addEventListener('admin-dashboard:prepare-report', handler);
    return () => window.removeEventListener('admin-dashboard:prepare-report', handler);
  }, [rowsDeferred, monthMode, range, selMonth, selYear, trendStatus, trendSvcType, svcTotalMode, svcFilter, svcSelMonth, svcSelYear, topServices, customActive, customFrom, customTo]);

  

  return (
    <div className={styles.chartContainer}>
      {/* Appointment Statistics */}
      <ChartCard
        title="Appointment Statistics"
        placeholderText="Appointment Trend Chart"
  options={monthMode ? [] : ranges}
  selected={range}
  onChange={(val) => startTransition(() => setRange(val))}
        controls={(
          <>
            <button
              type="button"
              className={`${styles.toggleBtn} ${monthMode ? styles.toggleActive : ''}`}
              onClick={() => setMonthMode(m => !m)}
              title="Toggle month view"
            >
              {monthMode ? 'By Month: On' : 'By Month'}
            </button>
            <select value={trendStatus} onChange={(e)=>startTransition(()=>setTrendStatus(e.target.value))} title="Filter by status">
              <option value="all">All Statuses</option>
              <option value="success">Success Only</option>
              <option value="scheduled">Scheduled (Pending/Approved)</option>
            </select>
            <select value={trendRescope} onChange={(e)=>startTransition(()=>setTrendRescope(e.target.value))} title="Reschedules">
              <option value="all">All (Reschedules + Regular)</option>
              <option value="only">Reschedules Only</option>
              <option value="exclude">Exclude Reschedules</option>
            </select>
            <select value={trendSvcType} onChange={(e)=>startTransition(()=>setTrendSvcType(e.target.value))} title="Service Type">
              {serviceFilters.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            {monthMode && (
              <select value={selMonth} onChange={(e)=>startTransition(()=>setSelMonth(parseInt(e.target.value,10)))}>
                {monthNames.map((m, idx) => (
                  <option key={m} value={idx}>{m}</option>
                ))}
              </select>
            )}
            <div className={styles.dateRangeControls}>
              <input type="date" value={customFrom} onChange={(e)=>startTransition(()=>setCustomFrom(e.target.value))} max={customTo || undefined} title="From" />
              <span>–</span>
              <input type="date" value={customTo} onChange={(e)=>startTransition(()=>setCustomTo(e.target.value))} min={customFrom || undefined} title="To" />
              {customActive && (
                <button type="button" className={styles.toggleBtn} onClick={()=>startTransition(()=>{ setCustomFrom(''); setCustomTo(''); })} title="Clear custom range">Clear</button>
              )}
            </div>
          </>
        )}
      >
        {loading ? (
          <div className={styles.chartPlaceholder}><p>Loading…</p></div>
        ) : (
          <div className={styles.chartStack}>
            <SvgBars
              data={trendData}
              showValues
              rotateLabels={false}
              labelMaxLen={10}
              labelFontSize={12}
              forceAllLabels={range.includes('7') || monthMode}
            />
            <div className={styles.chartLegend} aria-label="chart context">
              {isPending && (
                <span className={styles.pendingChip}><span className={styles.pendingSpinner} /> Refreshing…</span>
              )}
              <span className={styles.legendItem}><span className={styles.legendSwatch} /> Count by Day</span>
              <span className={styles.legendItem}>Range: {rangeDisplay}</span>
              <span className={styles.legendItem}>Status: {statusDisplay}</span>
              <span className={styles.legendItem}>Type: {trendTypeDisplay}</span>
            </div>
          </div>
        )}
      </ChartCard>

      {/* Most Used Services - Monthly only with Type filter */}
      <ChartCard
        title="Most Used Services"
        placeholderText="Most Used Services Chart"
        badge={mostUsed ? `Top: ${mostUsed.label} (${mostUsed.value})` : undefined}
        options={[]}
        selected={''}
  onChange={() => {}}
        controls={(
          <>
            <button
              type="button"
              className={`${styles.toggleBtn} ${svcTotalMode ? styles.toggleActive : ''}`}
              onClick={() => startTransition(()=>{
                setSvcTotalMode(m => !m);
                // When entering all-time, we don't need a month; when leaving, keep current month
              })}
              title="Toggle all time"
            >
              {svcTotalMode ? 'All Time: On' : 'All Time'}
            </button>
            <select value={svcFilter} onChange={(e)=>startTransition(()=>setSvcFilter(e.target.value))} title="Service Type">
              {serviceFilters.map(f => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
            {!svcTotalMode && (
              <select value={svcSelMonth} onChange={(e)=>startTransition(()=>setSvcSelMonth(parseInt(e.target.value,10)))} title="Month">
                {monthNames.map((m, idx) => (
                  <option key={m} value={idx}>{m}</option>
                ))}
              </select>
            )}
            <div className={styles.dateRangeControls}>
              <input type="date" value={customFrom} onChange={(e)=>startTransition(()=>setCustomFrom(e.target.value))} max={customTo || undefined} title="From" />
              <span>–</span>
              <input type="date" value={customTo} onChange={(e)=>startTransition(()=>setCustomTo(e.target.value))} min={customFrom || undefined} title="To" />
              {customActive && (
                <button type="button" className={styles.toggleBtn} onClick={()=>startTransition(()=>{ setCustomFrom(''); setCustomTo(''); })} title="Clear custom range">Clear</button>
              )}
            </div>
          </>
        )}
      >
        {loading ? (
          <div className={styles.chartPlaceholder}><p>Loading…</p></div>
        ) : (
          <div className={styles.chartStack}>
            <SvgBars
              data={topServices}
              showValues={topServices.length <= 45}
              rotateLabels={true}
              labelFontSize={topServices.length > 30 ? 10 : 11}
              forceAllLabels
            />
            <div className={styles.chartLegend} aria-label="chart context">
              {isPending && (
                <span className={styles.pendingChip}><span className={styles.pendingSpinner} /> Refreshing…</span>
              )}
              <span className={styles.legendItem}><span className={styles.legendSwatch} /> Count by Service</span>
              <span className={styles.legendItem}>Type: {svcTypeDisplay}</span>
              <span className={styles.legendItem}>Range: {svcRangeDisplay}</span>
              {svcHasOthers && (
                <span className={styles.legendItem}>Grouped: Top {MAX_SERVICE_BARS - 1} + Others</span>
              )}
            </div>
          </div>
        )}
      </ChartCard>
    </div>
  );
}
