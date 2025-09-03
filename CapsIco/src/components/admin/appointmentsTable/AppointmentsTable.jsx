import React, { useState } from 'react';
import styles from './AppointmentsTable.module.css';

export function AppointmentsTable() {
  const [rows, setRows] = useState([
    {
      id: 1,
      patient: 'Ana Cruz',
      email: 'ana.cruz@example.com',
      service: 'CBC Test',
      date: '2025-09-05',
      time: '09:00 AM',
      status: 'Pending',
    },
    {
      id: 2,
      patient: 'Ben Lim',
      email: 'ben.lim@example.com',
      service: 'Urinalysis',
      date: '2025-09-06',
      time: '01:30 PM',
      status: 'Approved',
    },
    {
      id: 3,
      patient: 'Carla Reyes',
      email: 'carla.r@example.com',
      service: 'Wellness Package A',
      date: '2025-09-07',
      time: '10:15 AM',
      status: 'Pending',
    },
  ]);

  const setStatus = (id, status) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));

  const onApprove = (id) => setStatus(id, 'Approved');
  const onDecline = (id) => setStatus(id, 'Declined');
  const onDelete = (id) => {
    if (!confirm('Delete this appointment?')) return;
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className={styles.card}>
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Patient</th>
              <th>Email</th>
              <th>Service</th>
              <th>Date</th>
              <th>Time</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id}>
                <td>{row.patient}</td>
                <td>{row.email}</td>
                <td>{row.service}</td>
                <td>{row.date}</td>
                <td>{row.time}</td>
                <td>
                  <span
                    className={`${styles.status} ${
                      row.status === 'Approved'
                        ? styles.approved
                        : row.status === 'Declined'
                        ? styles.declined
                        : styles.pending
                    }`}
                  >
                    {row.status}
                  </span>
                </td>
                <td className={styles.actions}>
                  <button
                    className={`${styles.btn} ${styles.btnApprove}`}
                    onClick={() => onApprove(row.id)}
                    title="Approve"
                  >
                    Approve
                  </button>
                  <button
                    className={`${styles.btn} ${styles.btnDecline}`}
                    onClick={() => onDecline(row.id)}
                    title="Decline"
                  >
                    Decline
                  </button>
                  <button
                    className={`${styles.btn} ${styles.btnDelete}`}
                    onClick={() => onDelete(row.id)}
                    title="Delete"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

