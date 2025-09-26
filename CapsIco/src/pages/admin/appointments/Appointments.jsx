import React, { useState } from 'react';
import styles from './Appointments.module.css';
import { AppointmentsTable } from '/src/components/admin/appointmentsTable/AppointmentsTable';

export function Appointments() {
  const [refreshTick, setRefreshTick] = useState(0);
  const onRefresh = () => setRefreshTick((n) => n + 1);
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
        <AppointmentsTable refreshKey={refreshTick} />
      </div>
    </main>
  );
}

