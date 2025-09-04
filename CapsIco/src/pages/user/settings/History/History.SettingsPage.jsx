import React, { useMemo, useState } from 'react';
import styles from './History.SettingsPage.module.css';

// Demo data enriched with provider, price info, and reference
const demoItems = [
  {
    id: 'PL-20250820-001',
    service: 'CBC Test',
    provider: 'Prime Medical Laboratory',
    date: '2025-08-20',
    time: '09:00 AM',
    status: 'Completed',
    price: 'Varies',
    note: "Panel per doctor's request",
  },
  {
    id: 'PL-20250822-002',
    service: 'Urinalysis',
    provider: 'Prime Medical Laboratory',
    date: '2025-08-22',
    time: '02:30 PM',
    status: 'Cancelled',
    price: 'Varies',
    note: 'Cancelled by patient',
  },
  {
    id: 'PL-20250825-003',
    service: 'Pre-Employment Package A',
    provider: 'Prime Medical Laboratory',
    date: '2025-08-25',
    time: '11:15 AM',
    status: 'Approved',
    price: 'PHP 599',
    note: 'Includes CBC, UA, Chest X-ray',
  },
  {
    id: 'PL-20250828-004',
    service: 'X-ray (Chest)',
    provider: 'Radiology Team',
    date: '2025-08-28',
    time: '04:00 PM',
    status: 'Pending',
    price: 'Varies',
    note: 'Price depends on view/plates',
  },
];

export function HistorySettingsPage() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All'); // All | Completed | Cancelled | Approved | Pending
  const [items] = useState(demoItems);

  const filtered = useMemo(() => {
    let data = items;
    if (status !== 'All') data = data.filter((i) => i.status === status);
    if (query.trim()) {
      const q = query.toLowerCase();
      data = data.filter((i) =>
        i.service.toLowerCase().includes(q) ||
        i.provider.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q)
      );
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
            placeholder="Search by service, provider or ref#..."
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
              <th>Ref #</th>
              <th>Service</th>
              <th>Provider</th>
              <th>Price</th>
              <th>Date</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr>
                <td className={styles.empty} colSpan="7">No records found.</td>
              </tr>
            ) : (
              filtered.map((row) => (
                <tr key={row.id}>
                  <td className={styles.mono}>{row.id}</td>
                  <td>
                    <div className={styles.mainCell}>{row.service}</div>
                    {row.note && <div className={styles.subCell}>{row.note}</div>}
                  </td>
                  <td>{row.provider}</td>
                  <td>{row.price}</td>
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
