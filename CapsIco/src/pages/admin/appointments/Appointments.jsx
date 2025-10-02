import React, { useMemo, useState } from 'react';
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
      if (norm === 'declined') return 'Declined';
      if (norm === 'successful' || norm === 'success' || norm === 'successfull') return 'Successful';
      return '';
    } catch (_) { return ''; }
  }, [location.search]);
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
        <AppointmentsTable refreshKey={refreshTick} initialFilterStatus={initialFilterStatus} />
      </div>
    </main>
  );
}

