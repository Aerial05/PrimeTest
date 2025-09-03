import React, { useMemo, useState } from 'react';
import styles from './History.SettingsPage.module.css';

export function HistorySettingsPage() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All'); // All | Completed | Cancelled | Approved | Pending
  const [items] = useState([
    { id: 1, service: 'CBC Test', date: '2025-08-20', time: '09:00 AM', status: 'Completed' },
    { id: 2, service: 'Urinalysis', date: '2025-08-22', time: '02:30 PM', status: 'Cancelled' },
    { id: 3, service: 'Wellness Package A', date: '2025-08-25', time: '11:15 AM', status: 'Approved' },
    { id: 4, service: 'X-Ray (Chest)', date: '2025-08-28', time: '04:00 PM', status: 'Pending' },
  ]);

  const filtered = useMemo(() => {
    let data = items;
    if (status !== 'All') data = data.filter((i) => i.status === status);
    if (query.trim()) {
      const q = query.toLowerCase();
      data = data.filter((i) => i.service.toLowerCase().includes(q));
    }
    return data;
  }, [items, status, query]);

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <h2>Appointment History</h2>
        <div className={styles.filters}>
          <input
            className={styles.search}
            type="text"
            placeholder="Search service..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select className={styles.select} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option>All</option>
            <option>Completed</option>
            <option>Approved</option>
            <option>Pending</option>
            <option>Cancelled</option>
          </select>
        </div>
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Service</th>
              <th>Date</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td className={styles.empty} colSpan="4">No records found.</td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id}>
                  <td>{row.service}</td>
                  <td>{row.date}</td>
                  <td>{row.time}</td>
                  <td>
                    <span className={`${styles.badge} ${
                      row.status === 'Completed' ? styles.badgeGreen :
                      row.status === 'Approved' ? styles.badgeBlue :
                      row.status === 'Pending' ? styles.badgeYellow : styles.badgeRed
                    }`}>
                      {row.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
