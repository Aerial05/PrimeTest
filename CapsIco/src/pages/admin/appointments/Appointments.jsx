import React, { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import styles from './Appointments.module.css';
import { AppointmentsTable } from '/src/components/admin/appointmentsTable/AppointmentsTable';

export function Appointments() {
  const [refreshTick, setRefreshTick] = useState(0);
  const onRefresh = () => setRefreshTick((n) => n + 1);
  const location = useLocation();
  const initialFilterStatus = useMemo(() => {
    try {
      const params = new URLSearchParams(location.search || '');
      const v = params.get('status');
      if (!v) return '';
      const norm = String(v).toLowerCase();
      if (norm === 'approved') return 'Approved';
      if (norm === 'pending') return 'Pending';
      if (norm === 'pending-reschedule') return 'Pending Reschedule';
      if (norm === 'approved-reschedule') return 'Approved Reschedule';
      if (norm === 'declined') return 'Declined';
      if (norm === 'successful' || norm === 'success' || norm === 'successfull') return 'Successful';
      return '';
    } catch (_) { return ''; }
  }, [location.search]);
  // Extract date filters from query
  const [initialDateFrom, initialDateTo] = useMemo(() => {
    try {
      const params = new URLSearchParams(location.search || '');
      const from = params.get('from') || '';
      const to = params.get('to') || '';
      return [from, to];
    } catch(_) { return ['', '']; }
  }, [location.search]);
  const rangePreset = useMemo(()=>{
    try {
      const params = new URLSearchParams(location.search || '');
      const r = String(params.get('range') || '').toLowerCase();
      return (r === 'next7' || r === 'thismonth') ? r : '';
    } catch { return ''; }
  }, [location.search]);
  const overdueFlag = useMemo(()=>{
    try {
      const params = new URLSearchParams(location.search || '');
      return params.get('overdue') === '1';
    } catch(_) { return false; }
  }, [location.search]);
  const attentionFlag = useMemo(()=>{
    try {
      const params = new URLSearchParams(location.search || '');
      return params.get('attention') === '1';
    } catch(_) { return false; }
  }, [location.search]);
  const excludeResFlag = useMemo(()=>{
    try {
      const params = new URLSearchParams(location.search || '');
      return params.get('excludeResched') === '1';
    } catch(_) { return false; }
  }, [location.search]);

  // Broadcast initial date filters to the AppointmentsTable via custom event
  useEffect(() => {
    const ev = new CustomEvent('appointments:set-initial-dates', { detail: { from: initialDateFrom, to: initialDateTo, range: rangePreset, overdue: overdueFlag, attention: attentionFlag, excludeResched: excludeResFlag } });
    window.dispatchEvent(ev);
  }, [initialDateFrom, initialDateTo, rangePreset, overdueFlag, attentionFlag, excludeResFlag]);
  return (
    <main className={styles.main}>
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <h2>Appointments</h2>
          <div className={styles.headerActions}>
            <button type="button" className={styles.refreshBtn} onClick={onRefresh} title="Refresh from Firebase">
              Refresh
            </button>
          </div>
        </div>
  <AppointmentsTable
    refreshKey={refreshTick}
    initialFilterStatus={initialFilterStatus}
    initialOverdue={overdueFlag}
    initialAttention={attentionFlag}
    initialExcludeResched={excludeResFlag}
  />
      </div>
    </main>
  );
}

