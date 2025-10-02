import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './StatsOverview.module.css';
import { StatCard } from '../statCard/StatCard';
import { FaCalendarCheck, FaFlask } from 'react-icons/fa';
import { onValue, ref as dbRef } from 'firebase/database';
import { usersDB } from '../../../../config/firebase-config';
import authService from '../../../../services/AuthService';

function toISODate(date) {
  try { return new Date(date).toISOString().slice(0,10); } catch (_) { return null; }
}

function tryParseDateString(s) {
  if (!s) return null;
  // Try ISO first
  const iso = toISODate(s);
  if (iso) return iso;
  // Try common formats (MM/DD/YYYY, DD/MM/YYYY)
  const parts = String(s).replace(/\s+/g,'').split(/[\/-]/);
  if (parts.length === 3) {
    const [a,b,c] = parts.map(p=>parseInt(p,10));
    if (!isNaN(a) && !isNaN(b) && !isNaN(c)) {
      // Heuristic: year is the 4-digit one
      const year = c > 31 ? c : (a > 31 ? a : (b > 31 ? b : c));
      if (String(year).length === 4) {
        // assume the remaining are month/day in some order; pick the <=12 as month
        const rest = [a,b,c].filter(x=>x!==year);
        const m = rest.find(x=>x>=1 && x<=12) || 1;
        const d = rest.find(x=>x!==m) || 1;
        const dt = new Date(year, m-1, d);
        if (!isNaN(dt.getTime())) return dt.toISOString().slice(0,10);
      }
    }
  }
  return null;
}

function isToday(dateStr) {
  const today = new Date().toISOString().slice(0,10);
  const iso = tryParseDateString(dateStr);
  return iso === today;
}


export function StatsOverview() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const storageKey = `adminDashboard:statsFilters:${authService.currentUser?.uid || 'anon'}`;
  // Filter for the "Tests Completed" stat: '7d' or '30d'
  const [completedRange, setCompletedRange] = useState('7d');
  // Filter for Upcoming Appointments: 'today' | '7d' | 'month'
  const [upcomingRange, setUpcomingRange] = useState('today');

  // Load saved filters on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (saved) {
        if (saved.completedRange === '7d' || saved.completedRange === '30d') setCompletedRange(saved.completedRange);
        if (saved.upcomingRange === 'today' || saved.upcomingRange === '7d' || saved.upcomingRange === 'month') setUpcomingRange(saved.upcomingRange);
      }
    } catch (_) { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist when filters change
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ completedRange, upcomingRange }));
    } catch (_) { /* ignore */ }
  }, [storageKey, completedRange, upcomingRange]);
  const [stats, setStats] = useState({
    // Upcoming (scheduled)
    upcomingToday: 0,
    upcoming7d: 0,
    upcomingMonth: 0,
    // Legacy naming kept for compatibility where referenced
    today: 0,
    completed7d: 0,
    completed30d: 0,
    approvedThisMonth: 0,
    pendingToday: 0,
    deltas: {
      // Upcoming (scheduled)
      upcomingToday: 0,
      upcoming7d: 0,
      upcomingMonth: 0,
      // Legacy naming kept for compatibility where referenced
      today: 0,
      completed7d: 0,
      completed30d: 0,
      approvedThisMonth: 0,
    }
  });

  useEffect(() => {
    const r = dbRef(usersDB, 'appointments');
    setLoading(true);
    const unsub = onValue(r, (snap) => {
      try {
        const obj = snap.exists() ? (snap.val() || {}) : {};
        const rows = Object.keys(obj).map(id => ({ id, ...obj[id] }));
        const now = new Date();
        const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
        const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);

        const statusIsApproved = (s) => {
          const status = String(s || '').toLowerCase();
          return status === 'successful' || status === 'completed' || status === 'approved';
        };
        // Only count as "Tests Completed" when explicitly success/successful
        const statusIsSuccess = (s) => {
          const status = String(s || '').toLowerCase();
          return status === 'successful' || status === 'success' || status === 'successfull';
        };
        // Scheduled = appointments that can still happen (not completed/declined/cancelled)
        const statusIsScheduled = (s) => {
          const v = String(s || '').toLowerCase();
          return v === 'pending' || v === 'approved';
        };

        const pickDate = (row) => tryParseDateString(row.UPDATED_AT || row.DATE_OF_APPOINTMENT || row.CREATED_AT);
        const inRange = (iso, start, end) => {
          if (!iso) return false;
          const d = new Date(iso);
          return d >= start && d <= end;
        };

        // Today vs Yesterday — strictly by DATE_OF_APPOINTMENT and only scheduled statuses
        const todayISO = startOfToday.toISOString().slice(0,10);
        const yesterdayISO = startOfYesterday.toISOString().slice(0,10);
        const todayCount = rows.filter(r => {
          const iso = tryParseDateString(r.DATE_OF_APPOINTMENT);
          return iso === todayISO && statusIsScheduled(r.BOOKING_STATUS);
        }).length;
        const yesterdayCount = rows.filter(r => {
          const iso = tryParseDateString(r.DATE_OF_APPOINTMENT);
          return iso === yesterdayISO && statusIsScheduled(r.BOOKING_STATUS);
        }).length;

        // Upcoming next 7 days (including today) vs previous 7 days
        const up7Start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const up7End = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 6, 23, 59, 59, 999);
        const prevUp7Start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        const prevUp7End = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 23, 59, 59, 999);
        const pickApptDate = (row) => tryParseDateString(row.DATE_OF_APPOINTMENT);
        const upcoming7d = rows.filter(r => statusIsScheduled(r.BOOKING_STATUS) && inRange(pickApptDate(r), up7Start, up7End)).length;
        const prevUpcoming7d = rows.filter(r => statusIsScheduled(r.BOOKING_STATUS) && inRange(pickApptDate(r), prevUp7Start, prevUp7End)).length;

        // Upcoming this month (entire current calendar month) vs last month
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        const upcomingMonth = rows.filter(r => statusIsScheduled(r.BOOKING_STATUS) && inRange(pickApptDate(r), thisMonthStart, thisMonthEnd)).length;
        const prevUpcomingMonth = rows.filter(r => statusIsScheduled(r.BOOKING_STATUS) && inRange(pickApptDate(r), lastMonthStart, lastMonthEnd)).length;

  // Last 7 days vs previous 7 days (success only)
        const current7Start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);
        const current7End = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        const prev7Start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 13);
        const prev7End = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 23, 59, 59, 999);
        const completed7d = rows.filter(r => statusIsSuccess(r.BOOKING_STATUS) && inRange(pickDate(r), current7Start, current7End)).length;
        const prevCompleted7d = rows.filter(r => statusIsSuccess(r.BOOKING_STATUS) && inRange(pickDate(r), prev7Start, prev7End)).length;

  // Last 30 days vs previous 30 days (success only)
  const current30Start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 29);
  const current30End = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  const prev30Start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 59);
  const prev30End = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30, 23, 59, 59, 999);
  const completed30d = rows.filter(r => statusIsSuccess(r.BOOKING_STATUS) && inRange(pickDate(r), current30Start, current30End)).length;
  const prevCompleted30d = rows.filter(r => statusIsSuccess(r.BOOKING_STATUS) && inRange(pickDate(r), prev30Start, prev30End)).length;

        // This month vs last month (approved set)
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
        const approvedThisMonth = rows.filter(r => statusIsApproved(r.BOOKING_STATUS) && inRange(pickDate(r), monthStart, monthEnd)).length;
        const approvedPrevMonth = rows.filter(r => statusIsApproved(r.BOOKING_STATUS) && inRange(pickDate(r), prevMonthStart, prevMonthEnd)).length;

        // Pending Today (strict pending by DATE_OF_APPOINTMENT)
        const pendingToday = rows.filter(r => {
          const status = String(r.BOOKING_STATUS || '').toLowerCase();
          if (status !== 'pending') return false;
          const iso = tryParseDateString(r.DATE_OF_APPOINTMENT);
          return iso === todayISO;
        }).length;

        const pct = (curr, prev) => {
          if (prev === 0) return curr > 0 ? 100 : 0;
          return Math.round(((curr - prev) / prev) * 100);
        };

        setStats({
          // Upcoming (scheduled)
          upcomingToday: todayCount,
          upcoming7d,
          upcomingMonth,
          // Legacy
          today: todayCount,
          completed7d,
          completed30d,
          approvedThisMonth,
          pendingToday,
          deltas: {
            // Upcoming (scheduled)
            upcomingToday: pct(todayCount, yesterdayCount),
            upcoming7d: pct(upcoming7d, prevUpcoming7d),
            upcomingMonth: pct(upcomingMonth, prevUpcomingMonth),
            // Legacy
            today: pct(todayCount, yesterdayCount),
            completed7d: pct(completed7d, prevCompleted7d),
            completed30d: pct(completed30d, prevCompleted30d),
            approvedThisMonth: pct(approvedThisMonth, approvedPrevMonth),
          }
        });
        setError('');
      } catch (e) {
        setError(e?.message || 'Failed to compute stats');
      } finally {
        setLoading(false);
      }
    }, (e) => {
      setError(e?.message || 'Failed to read stats');
      setLoading(false);
    });
    return () => { try { unsub && unsub(); } catch(_) {} };
  }, []);

  const todayStr = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' });

  // Contribute to the dashboard report snapshot
  useEffect(() => {
    const handler = () => {
      try {
        let prev = {};
        try { prev = JSON.parse(sessionStorage.getItem('adminDashboardReportSnapshot') || '{}'); } catch(_) {}
        const merged = {
          ...prev,
          capturedAt: prev.capturedAt || new Date().toISOString(),
          statsOverview: {
            upcoming: { today: stats.upcomingToday, sevenDays: stats.upcoming7d, month: stats.upcomingMonth },
            completed: { d7: stats.completed7d, d30: stats.completed30d },
            approvedThisMonth: stats.approvedThisMonth,
            pendingToday: stats.pendingToday,
            filters: {
              completedRange,
              upcomingRange,
              todayStr,
            }
          }
        };
        sessionStorage.setItem('adminDashboardReportSnapshot', JSON.stringify(merged));
      } catch(_) { /* ignore */ }
    };
    window.addEventListener('admin-dashboard:prepare-report', handler);
    return () => window.removeEventListener('admin-dashboard:prepare-report', handler);
  }, [stats, completedRange, upcomingRange, todayStr]);
  // Upcoming appointments derived values based on filter
  const upcomingValue = upcomingRange === 'month' ? stats.upcomingMonth : upcomingRange === '7d' ? stats.upcoming7d : stats.upcomingToday;
  const upcomingDelta = upcomingRange === 'month' ? stats.deltas.upcomingMonth : upcomingRange === '7d' ? stats.deltas.upcoming7d : stats.deltas.upcomingToday;
  const upcomingLabel = 'Upcoming Appointments';
  const upcomingDeltaTitle = upcomingRange === 'month' ? 'vs last month' : upcomingRange === '7d' ? 'vs previous 7 days' : 'vs yesterday';
  const upcomingMetaLeft = upcomingRange === 'month' ? 'This month' : upcomingRange === '7d' ? 'Next 7 days' : todayStr;
  const completedValue = completedRange === '30d' ? stats.completed30d : stats.completed7d;
  const completedDelta = completedRange === '30d' ? stats.deltas.completed30d : stats.deltas.completed7d;
  const completedLabel = completedRange === '30d' ? 'Tests Completed (30d)' : 'Tests Completed (7d)';
  const completedDeltaTitle = completedRange === '30d' ? 'vs previous 30 days' : 'vs previous 7 days';
  const completedMetaLeft = completedRange === '30d' ? 'Last 30 days' : 'Last 7 days';
  const cards = [
    {
      icon: <FaCalendarCheck />,
      value: loading ? '…' : upcomingValue,
      label: upcomingLabel,
      color: 'blue',
      delta: upcomingDelta,
      deltaTitle: upcomingDeltaTitle,
      metaLeft: upcomingMetaLeft,
      metaRight: (
        <select
          value={upcomingRange}
          onChange={(e) => setUpcomingRange(e.target.value)}
          aria-label="Upcoming appointments range"
          style={{
            background: 'transparent',
            border: '1px solid var(--border, #e5e7eb)',
            borderRadius: 6,
            padding: '2px 6px',
            fontSize: 12,
          }}
        >
          <option value="today">Today</option>
          <option value="7d">Next 7 days</option>
          <option value="month">This month</option>
        </select>
      ),
    },
    {
      icon: <FaFlask />,
      value: loading ? '…' : completedValue,
      label: completedLabel,
      color: 'green',
      delta: completedDelta,
      deltaTitle: completedDeltaTitle,
      metaLeft: completedMetaLeft,
      metaRight: (
        <select
          value={completedRange}
          onChange={(e) => setCompletedRange(e.target.value)}
          aria-label="Completed range"
          style={{
            background: 'transparent',
            border: '1px solid var(--border, #e5e7eb)',
            borderRadius: 6,
            padding: '2px 6px',
            fontSize: 12,
          }}
        >
          <option value="7d">7 days</option>
          <option value="30d">30 days</option>
        </select>
      ),
    },
    {
      icon: <FaCalendarCheck />,
      value: loading ? '…' : stats.approvedThisMonth,
      label: 'Approved This Month',
      color: 'purple',
      delta: stats.deltas.approvedThisMonth,
      deltaTitle: 'vs last month',
      metaLeft: new Date().toLocaleDateString(undefined, { month: 'short' }),
  metaRight: 'Status: Approved/Completed',
    },
    {
      icon: <FaCalendarCheck />,
      value: loading ? '…' : stats.pendingToday,
      label: 'Pending Appointments',
      color: 'pink',
      metaLeft: todayStr,
      metaRight: (
        <button
          className={styles.linkBtn}
          onClick={() => navigate('/appointment-management?status=Pending')}
        >
          Manage Pending →
        </button>
      ),
    },
  ];

  return (
    <div className={styles.statsGrid}>
      {cards.map((c, i) => (
        <StatCard key={i} icon={c.icon} value={c.value} label={c.label} color={c.color} error={error} loading={loading} delta={c.delta} deltaTitle={c.deltaTitle} metaLeft={c.metaLeft} metaRight={c.metaRight} />
      ))}
    </div>
  );
}
