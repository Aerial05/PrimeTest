import React, { useEffect, useMemo, useState } from 'react';
import styles from './AppointmentsTable.module.css';
import appointmentsService from '@/services/AppointmentsService';
import servicePackagesService from '@/services/ServicePackagesService';
import singleServicesService from '@/services/SingleServicesService';

function to12h(hhmm) {
  if (!hhmm) return '—';
  const [hS, mS] = String(hhmm).split(':');
  const h = Number(hS), m = Number(mS || 0);
  if (Number.isNaN(h)) return String(hhmm);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function calcAge(birthday) {
  if (!birthday) return '—';
  const d = new Date(birthday);
  if (isNaN(d.getTime())) return '—';
  const today = new Date();
  let age = today.getFullYear() - d.getFullYear();
  const m = today.getMonth() - d.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--;
  return age < 0 ? '—' : String(age);
}

function toStatusLabel(s) {
  const v = String(s || '').toLowerCase();
  if (v === 'approved') return 'Approved';
  if (v === 'declined') return 'Declined';
  return 'Pending';
}

export function AppointmentsTable({ refreshKey = 0 }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expanded, setExpanded] = useState(() => new Set());
  // Filters / search
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState(''); // '', Approved, Pending, Declined
  const [filterType, setFilterType] = useState(''); // '', Service, Package
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const toggleExpand = (id) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [list, packages, singles] = await Promise.all([
        appointmentsService.list(),
        servicePackagesService.list().catch(() => []),
        singleServicesService.list().catch(() => []),
      ]);

      // Build maps for quick name lookup
      const singleNameById = {};
      for (const db of singles || []) {
        const sid = db.SERVICE_ID || db['Service_ID'] || db.id;
        if (sid) singleNameById[String(sid)] = db.NAME || '';
      }
      const pkgNameById = {};
      for (const db of packages || []) {
        const pid = db.SERVICE_PACKGE_ID || db.SERVICE_PACKAGE_ID || db.id;
        if (pid) pkgNameById[String(pid)] = db.NAME || '';
      }

      const mapped = (list || []).map((r) => {
        const id = r.APPT_ID || r.id;
        const type = (r.SERVICE_TYPE || '').toLowerCase();
        const svcId = r.SERVICE_ID || '';
        const svcName = type === 'package'
          ? (pkgNameById[String(svcId)] || svcId || '—')
          : (singleNameById[String(svcId)] || svcId || '—');
        return {
          id,
          patient: [r.FIRST_NAME, r.LAST_NAME].filter(Boolean).join(' ') || '—',
          email: r.EMAIL || '—',
          age: calcAge(r.BIRTHDAY),
          gender: r.GENDER || '—',
          type: type ? (type === 'package' ? 'Package' : 'Service') : '—',
          serviceName: svcName,
          date: r.DATE_OF_APPOINTMENT || '—',
          time: r.TIME_SLOT || '—',
          status: toStatusLabel(r.BOOKING_STATUS),
          raw: r,
        };
      });
      setRows(mapped);
    } catch (e) {
      console.warn('Failed to load appointments', e);
      setError('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshKey]);

  const setStatusLocal = (id, status) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));

  const onApprove = async (id) => {
    const newStatus = 'approved';
    try {
      await appointmentsService.updateStatus(id, newStatus);
      setStatusLocal(id, 'Approved');
    } catch (e) {
      alert('Failed to approve appointment');
    }
  };

  const onDecline = async (id) => {
    const newStatus = 'declined';
    try {
      await appointmentsService.updateStatus(id, newStatus);
      setStatusLocal(id, 'Declined');
    } catch (e) {
      alert('Failed to decline appointment');
    }
  };

  const onPending = async (id) => {
    const newStatus = 'pending';
    try {
      await appointmentsService.updateStatus(id, newStatus);
      setStatusLocal(id, 'Pending');
    } catch (e) {
      alert('Failed to set status to pending');
    }
  };

  const onDelete = async (id) => {
    const ok = confirm('Archive this appointment?\n\nThis will move it to the archive and remove it from the active list.');
    if (!ok) return;
    try {
      await appointmentsService.archive(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
      setExpanded((prev) => {
        const next = new Set(prev); next.delete(id); return next;
      });
    } catch (e) {
      alert('Failed to archive appointment');
    }
  };

  const filteredRows = useMemo(() => {
    const s = search.trim().toLowerCase();
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo) : null;
    return rows.filter(r => {
      if (filterStatus && r.status !== filterStatus) return false;
      if (filterType && r.type !== filterType) return false;
      if (s) {
        const hay = `${r.patient} ${r.email} ${r.serviceName} ${r.type} ${r.status}`.toLowerCase();
        if (!hay.includes(s)) return false;
      }
      if (from || to) {
        if (!r.date) return false;
        const d = new Date(r.date);
        if (Number.isNaN(d.getTime())) return false;
        if (from && d < from) return false;
        if (to) {
          // include entire end day
            const end = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23,59,59,999);
            if (d > end) return false;
        }
      }
      return true;
    });
  }, [rows, search, filterStatus, filterType, dateFrom, dateTo]);

  const clearFilters = () => {
    setSearch(''); setFilterStatus(''); setFilterType(''); setDateFrom(''); setDateTo('');
  };

  return (
    <div className={styles.card}>
      <div className={styles.toolbar}>
        <div className={styles.filterGroup}>
          <input
            className={styles.input}
            placeholder="Search (patient, email, service...)"
            value={search}
            onChange={(e)=>setSearch(e.target.value)}
          />
          <select className={styles.select} value={filterStatus} onChange={(e)=>setFilterStatus(e.target.value)}>
            <option value="">All Statuses</option>
            <option value="Approved">Approved</option>
            <option value="Pending">Pending</option>
            <option value="Declined">Declined</option>
          </select>
          <select className={styles.select} value={filterType} onChange={(e)=>setFilterType(e.target.value)}>
            <option value="">All Types</option>
            <option value="Service">Service</option>
            <option value="Package">Package</option>
          </select>
          <input
            type="date"
            className={styles.input}
            value={dateFrom}
            onChange={(e)=>setDateFrom(e.target.value)}
            placeholder="From"
          />
          <input
            type="date"
            className={styles.input}
            value={dateTo}
            onChange={(e)=>setDateTo(e.target.value)}
            placeholder="To"
          />
          <button className={`${styles.btn} ${styles.btnLight}`} onClick={clearFilters}>Reset</button>
        </div>
        <div className={styles.meta}>{filteredRows.length} / {rows.length} shown</div>
      </div>
      <div className={styles.tableWrapper}>
        {loading ? (
          <div className={styles.loading}>Loading appointments…</div>
        ) : error ? (
          <div className={styles.error}>{error}</div>
        ) : filteredRows.length === 0 ? (
          <div className={styles.empty}>No appointments found.</div>
        ) : null}
        <table className={styles.table}>
          <thead>
            <tr>
              <th className={styles.colPatient}>Patient</th>
              <th className={styles.colEmail}>Email</th>
              <th className={styles.colAge}>Age</th>
              <th className={styles.colGender}>Gender</th>
              <th className={styles.colType}>Type</th>
              <th className={styles.colService}>Service</th>
              <th className={styles.colDate}>Appointment Date</th>
              <th className={styles.colTime}>Appointment Time</th>
              <th className={styles.colStatus}>Status</th>
              <th className={styles.colActions}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => (
              <React.Fragment key={row.id}>
                <tr>
                  <td className={`${styles.cellEllipsis} ${styles.colPatient}`}>{row.patient}</td>
                  <td className={`${styles.cellEllipsis} ${styles.colEmail}`}>{row.email}</td>
                  <td className={styles.colAge}>{row.age}</td>
                  <td className={styles.colGender}>{row.gender}</td>
                  <td className={styles.colType}>{row.type}</td>
                  <td className={`${styles.cellEllipsis} ${styles.colService}`}>{row.serviceName}</td>
                  <td className={styles.colDate}>{row.date}</td>
                  <td className={styles.colTime}>{to12h(row.time)}</td>
                  <td className={styles.colStatus}>
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
                  <td className={`${styles.actions} ${styles.colActions}`}>
                    <button
                      className={`${styles.btn} ${styles.btnSecondary}`}
                      onClick={() => toggleExpand(row.id)}
                      title={expanded.has(row.id) ? 'Hide details' : 'Show details'}
                    >
                      {expanded.has(row.id) ? 'Hide' : 'Details'}
                    </button>
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
                      className={`${styles.btn} ${styles.btnPending}`}
                      onClick={() => onPending(row.id)}
                      title="Mark as Pending"
                    >
                      Pending
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
                {expanded.has(row.id) && (
                  <tr className={styles.detailsRow}>
                    <td className={styles.detailsCell} colSpan={10}>
                      <div className={styles.detailsPanel}>
                        <div className={styles.detailSection}>
                          <div className={styles.detailTitle}>User Info</div>
                          <div className={styles.detailGrid}>
                            <div><span>First Name</span><strong>{row.raw.FIRST_NAME || '—'}</strong></div>
                            <div><span>Last Name</span><strong>{row.raw.LAST_NAME || '—'}</strong></div>
                            <div><span>Phone</span><strong>{row.raw.PHONE || '—'}</strong></div>
                            <div><span>Email</span><strong>{row.raw.EMAIL || '—'}</strong></div>
                            <div><span>Birthday</span><strong>{row.raw.BIRTHDAY || '—'}</strong></div>
                            <div><span>Gender</span><strong>{row.raw.GENDER || '—'}</strong></div>
                          </div>
                        </div>
                        <div className={styles.detailSection}>
                          <div className={styles.detailTitle}>Service Info</div>
                          <div className={styles.detailGrid}>
                            <div><span>Type</span><strong>{row.type}</strong></div>
                            <div><span>Name</span><strong>{row.serviceName}</strong></div>
                            <div><span>Service ID</span><strong>{row.raw.SERVICE_ID || '—'}</strong></div>
                          </div>
                        </div>
                        <div className={styles.detailSection}>
                          <div className={styles.detailTitle}>Appointment Info</div>
                          <div className={styles.detailGrid}>
                            <div><span>Date</span><strong>{row.date}</strong></div>
                            <div><span>Time</span><strong>{to12h(row.time)}</strong></div>
                            <div><span>Status</span><strong>{row.status}</strong></div>
                            <div><span>Chief Complaint</span><strong>{row.raw.CHIEF_COMPLAINT || '—'}</strong></div>
                            <div className={styles.fullRow}><span>Special Instructions</span><strong>{row.raw.SPECIAL_INSTRUCTIONS || '—'}</strong></div>
                            <div><span>Created</span><strong>{row.raw.CREATED_AT || '—'}</strong></div>
                            <div><span>Updated</span><strong>{row.raw.UPDATED_AT || '—'}</strong></div>
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

