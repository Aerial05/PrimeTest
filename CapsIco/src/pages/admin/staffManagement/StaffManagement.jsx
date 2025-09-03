import React from 'react';

import { AppointmentsTable } from '/src/components/admin/appointmentsTable/AppointmentsTable';
import styles from './StaffManagement.module.css';

export function StaffManagement() {
  return (
    <>
      <div className={styles.banner}>
        <div className={styles.container}>
          <p>Admin</p>
          <h1>Appointment Management</h1>
        </div>
      </div>

      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Appointments</h2>
          </div>
          <AppointmentsTable />
        </div>
      </main>
    </>
  );
}
