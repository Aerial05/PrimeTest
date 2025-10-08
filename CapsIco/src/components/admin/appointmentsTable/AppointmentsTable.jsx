import React, { useEffect, useMemo, useState } from 'react';
import styles from './AppointmentsTable.module.css';
import appointmentsService from '@/services/AppointmentsService';
import { sendAppointmentEmailCallable } from '/src/config/firebase-config';
import servicePackagesService from '@/services/ServicePackagesService';
import singleServicesService from '@/services/SingleServicesService';
import { useLocation } from 'react-router-dom';
import activityLogService from '/src/services/ActivityLogService';

function to12h(hhmm) {
  if (!hhmm) return '—';
  const [hS, mS] = String(hhmm).split(':');
  const h = Number(hS), m = Number(mS || 0);
  if (Number.isNaN(h)) return String(hhmm);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

function toLongDate(input) {
  if (input === null || input === undefined) return '—';
  // Handle Firestore-like Timestamp
  if (typeof input === 'object' && input && 'seconds' in input) {
    const ms = (Number(input.seconds) || 0) * 1000 + Math.floor((Number(input.nanoseconds) || 0) / 1e6);
    return toLongDate(new Date(ms));
  }
  // Numeric epoch
  if (typeof input === 'number' || (typeof input === 'string' && /^\d{10,13}$/.test(input))) {
    const n = Number(input);
    const d = new Date(n < 1e12 ? n * 1000 : n);
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }
  // YYYY-MM-DD safe local date construction
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, day] = input.split('-').map((v) => Number(v));
    const d = new Date(y, (m || 1) - 1, day || 1);
    if (!Number.isNaN(d.getTime())) return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }
  // Date instance or any other parseable string
  const d = input instanceof Date ? input : new Date(input);
  if (Number.isNaN(d.getTime())) return String(input || '—');
  try {
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  } catch(_) {
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }
}

// Parse any supported input into a Date or return null if invalid
function toDateAny(input) {
  if (input === null || input === undefined) return null;
  if (input instanceof Date) return Number.isNaN(input.getTime()) ? null : input;
  if (typeof input === 'object' && input && 'seconds' in input) {
    const ms = (Number(input.seconds) || 0) * 1000 + Math.floor((Number(input.nanoseconds) || 0) / 1e6);
    const d = new Date(ms);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof input === 'number' || (typeof input === 'string' && /^\d{10,13}$/.test(input))) {
    const n = Number(input);
    const d = new Date(n < 1e12 ? n * 1000 : n);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, day] = input.split('-').map((v) => Number(v));
    const d = new Date(y, (m || 1) - 1, day || 1);
    return Number.isNaN(d.getTime()) ? null : d;
  }
  const d = new Date(input);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toLongDateTime(input) {
  const d = toDateAny(input);
  if (!d) return '—';
  const datePart = toLongDate(d);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const timePart = `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  return `${datePart} ${timePart}`;
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
  if (v === 'successful') return 'Successful';
  return 'Pending';
}

export function AppointmentsTable({ refreshKey = 0, initialFilterStatus = '', initialOverdue = false, initialAttention = false }) {
  // Toggle whether proof is required to mark an appointment as Successful
  const requireProofForSuccess = true;
  const [rows, setRows] = useState([]);
  // Inline popup for alerts (replaces window.alert)
  const [popup, setPopup] = useState({ open: false, title: '', message: '', type: 'info' });
  const showPopup = ({ title = 'Notice', message = '', type = 'info' } = {}) => setPopup({ open: true, title, message, type });
  const closePopup = () => setPopup((p) => ({ ...p, open: false }));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalId, setModalId] = useState(null);
  const [modalStatus, setModalStatus] = useState('');
  const [modalSaving, setModalSaving] = useState(false);
  // Decline reason (optional)
  const [declineReason, setDeclineReason] = useState('');
  // Confirm toast for sending email
  const [confirmSend, setConfirmSend] = useState({ open: false, onConfirm: null, title: '', message: '' });
  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 10;
  // Filters / search
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState(''); // '', Approved, Pending, Declined
  const [filterType, setFilterType] = useState(''); // '', Service, Package
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [datePreset, setDatePreset] = useState(''); // '', next7, thismonth
  const [filterOverdue, setFilterOverdue] = useState(initialOverdue);
  const [filterAttention, setFilterAttention] = useState(initialAttention);
  const [didApplyInitialDates, setDidApplyInitialDates] = useState(false);
  const [didApplyFromQuery, setDidApplyFromQuery] = useState(false);
  const location = useLocation();
  // Insert Proof state
  const [proofFile, setProofFile] = useState(null);
  const [proofUploading, setProofUploading] = useState(false);
  const [proofError, setProofError] = useState('');
  const [proofProgress, setProofProgress] = useState(0);

  const openModal = (id) => setModalId(id);
  const closeModal = () => setModalId(null);
  const selected = useMemo(() => rows.find(r => r.id === modalId), [rows, modalId]);

  useEffect(() => {
    if (modalId && selected) {
      setModalStatus(selected.status || 'Pending');
      setDeclineReason('');
    } else {
      setModalStatus('');
      setDeclineReason('');
    }
    // reset proof UI state on open/close
    setProofFile(null);
    setProofError('');
    setProofUploading(false);
    setProofProgress(0);
  }, [modalId, selected?.status]);

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
        const rawDate = r.DATE_OF_APPOINTMENT || '';
        return {
          id,
          patient: [r.FIRST_NAME, r.LAST_NAME].filter(Boolean).join(' ') || '—',
          email: r.EMAIL || '—',
          age: calcAge(r.BIRTHDAY),
          gender: r.GENDER || '—',
          type: type ? (type === 'package' ? 'Package' : 'Service') : '—',
          serviceName: svcName,
          date: rawDate || '—',
          dateDisplay: toLongDate(rawDate || ''),
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

  // Sync initial status filter from prop (e.g., via ?status=Pending)
  useEffect(() => {
    if (initialFilterStatus && (filterStatus !== initialFilterStatus)) {
      setFilterStatus(initialFilterStatus);
    }
    // do not add filterStatus to deps to avoid loop
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFilterStatus]);

  // Apply initial date filters passed via a window event
  useEffect(() => {
    const onInitDates = (e) => {
      if (didApplyInitialDates || didApplyFromQuery) return;
      try {
        const { from, to, overdue, attention } = e.detail || {};
        if (from) setDateFrom(from);
        if (to) setDateTo(to);
        if (overdue === true) setFilterOverdue(true);
        if (attention === true) setFilterAttention(true);
        setDidApplyInitialDates(true);
      } catch(_){ /* ignore */ }
    };
    window.addEventListener('appointments:set-initial-dates', onInitDates);
    return () => window.removeEventListener('appointments:set-initial-dates', onInitDates);
  }, [didApplyInitialDates, didApplyFromQuery]);

  // Derive overdue status for each row
  const isRowOverdue = (r) => {
    const status = String(r.status || '').toLowerCase();
    if (['successful','success','successfull'].includes(status)) return false;
    if (['declined','cancelled','canceled','rejected','no-show','noshow'].includes(status)) return false;
    if (!r.date) return false;
    const d = new Date(r.date);
    if (Number.isNaN(d.getTime())) return false;
    // Build full datetime using time (24h) or fallback end-of-day
    let dt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23,59,59,999);
    if (r.time && /\d{1,2}:\d{2}/.test(r.time)) {
      const [hS, mS] = r.time.split(':');
      const h = parseInt(hS,10); const m = parseInt(mS,10) || 0;
      if (!Number.isNaN(h) && h>=0 && h<=23 && !Number.isNaN(m) && m>=0 && m<=59) {
        dt = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, m, 0, 0);
      }
    }
    return dt.getTime() < Date.now();
  };

  const isRowAttention = (r) => {
    // Attention = Pending OR Overdue
    const status = String(r.status || '').toLowerCase();
    if (status === 'pending') return true;
    return isRowOverdue(r);
  };

  // Helper to format a Date as yyyy-mm-dd
  const fmt = (d) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };

  // Apply date preset to dateFrom/dateTo
  useEffect(() => {
    if (!datePreset) return;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    if (datePreset === 'next7') {
      const to = new Date(startOfToday);
      to.setDate(to.getDate() + 7); // inclusive of next 7 days window
      setDateFrom(fmt(startOfToday));
      setDateTo(fmt(to));
    } else if (datePreset === 'thismonth') {
      const first = new Date(now.getFullYear(), now.getMonth(), 1);
      const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      const from = startOfToday > first ? startOfToday : first; // upcoming within this month
      setDateFrom(fmt(from));
      setDateTo(fmt(last));
    }
  }, [datePreset]);

  // Parse URL query parameters to set filters and date presets
  useEffect(() => {
    const qs = new URLSearchParams(location.search || '');
    let applied = false;
    // status
    const qStatus = (qs.get('status') || '').toLowerCase();
    if (qStatus) {
      const map = { approved: 'Approved', pending: 'Pending', declined: 'Declined', successful: 'Successful' };
      const statusVal = map[qStatus] || '';
      if (statusVal) {
        setFilterStatus(statusVal);
        applied = true;
      }
    }
    // range preset
    const qRange = (qs.get('range') || '').toLowerCase();
    if (qRange === 'next7' || qRange === 'thismonth') {
      setDatePreset(qRange);
      applied = true;
    } else {
      // explicit dates
      const from = qs.get('from');
      const to = qs.get('to');
      if (from || to) {
        setDatePreset('');
        if (from) setDateFrom(from);
        if (to) setDateTo(to);
        applied = true;
      }
    }
    if (applied) setDidApplyFromQuery(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  const setStatusLocal = (id, status) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));

  const onApprove = async (id) => {
    const newStatus = 'approved';
    try {
      await appointmentsService.updateStatus(id, newStatus);
      setStatusLocal(id, 'Approved');
    } catch (e) {
      showPopup({ title: 'Update failed', message: 'Failed to approve appointment.', type: 'error' });
    }
  };

  const onDecline = async (id) => {
    const newStatus = 'declined';
    try {
      await appointmentsService.updateStatus(id, newStatus);
      setStatusLocal(id, 'Declined');
    } catch (e) {
      showPopup({ title: 'Update failed', message: 'Failed to decline appointment.', type: 'error' });
    }
  };

  const onPending = async (id) => {
    const newStatus = 'pending';
    try {
      await appointmentsService.updateStatus(id, newStatus);
      setStatusLocal(id, 'Pending');
    } catch (e) {
      showPopup({ title: 'Update failed', message: 'Failed to set status to pending.', type: 'error' });
    }
  };

  const onDelete = async (id) => {
    const ok = confirm('Archive this appointment?\n\nThis will move it to the archive and remove it from the active list.');
    if (!ok) return;
    try {
      await appointmentsService.archive(id);
      setRows((prev) => prev.filter((r) => r.id !== id));
      if (modalId === id) closeModal();
    } catch (e) {
      showPopup({ title: 'Archive failed', message: 'Failed to archive appointment.', type: 'error' });
    }
  };

  const onSubmitModalStatus = async () => {
    if (!selected) return;
    const desired = modalStatus || 'Pending';
    const map = { Approved: 'approved', Pending: 'pending', Declined: 'declined', Successful: 'successful' };
    const backend = map[desired] || 'pending';

    // Guard rails: Successful requires Approved first, and optionally requires proof
    if (desired === 'Successful') {
      const isApproved = String(selected.status || '').toLowerCase() === 'approved';
      const hasProof = !!(selected.raw?.PROOF || selected.raw?.proof);
      if (!isApproved) {
        alert('To mark as Successful, approve the appointment first.');
        return;
      }
      if (requireProofForSuccess && !hasProof) {
        alert('Please upload a proof image before marking this appointment as Successful.');
        return;
      }
    }
    try {
      setModalSaving(true);
      await appointmentsService.updateStatus(selected.id, backend);
      setStatusLocal(selected.id, desired);
      // Ask before sending an email when status change implies an email
      if (backend === 'approved' || backend === 'successful' || backend === 'declined') {
        setConfirmSend({
          open: true,
          title: 'Send email?',
          message: 'Do you want to send an email notification now?',
          onConfirm: async () => {
            try {
              const res = await sendAppointmentEmailCallable({
                apptId: selected.id,
                status: backend,
                serviceName: selected.serviceName,
                serviceType: selected.type,
                date: selected.date || selected.raw?.DATE_OF_APPOINTMENT,
                time: selected.time || selected.raw?.TIME_SLOT,
                serviceId: selected.raw?.SERVICE_ID,
                ...(backend === 'declined' && declineReason ? { declineReason } : {}),
              });
              if (res && res.ok) {
                showPopup({ title: 'Email sent', message: 'A notification email was sent to the user.', type: 'info' });
                // No log for email sends per requirement
              }
            } catch (e) {
              console.warn('sendAppointmentEmail callable failed', e);
            } finally {
              setConfirmSend({ open: false, onConfirm: null, title: '', message: '' });
            }
          }
        });
      }
    } catch (e) {
      showPopup({ title: 'Update failed', message: 'Failed to update status.', type: 'error' });
    } finally {
      setModalSaving(false);
    }
  };

  // Upload proof image and optionally mark as Successful if already Approved
  const onUploadProof = async () => {
    if (!selected) return;
    if (!proofFile) {
      setProofError('Please choose an image to upload.');
      return;
    }
    try {
      setProofError('');
      setProofUploading(true);
  setProofProgress(0);
      const fd = new FormData();
      // database field name: "proof"
      fd.append('proof', proofFile);

      let proofUrl = null;
      if (typeof appointmentsService.uploadProof === 'function') {
  const res = await appointmentsService.uploadProof(selected.id, fd, (pct) => setProofProgress(pct));
        proofUrl = res?.url || res?.proof || res?.PROOF || null;
      } else if (typeof appointmentsService.updateProof === 'function') {
        const res = await appointmentsService.updateProof(selected.id, fd);
        proofUrl = res?.url || res?.proof || res?.PROOF || null;
      } else {
        throw new Error('appointmentsService.uploadProof is not implemented.');
      }
      // Update local state: add proof
      setRows(prev => prev.map(r => r.id === selected.id ? ({
        ...r,
        raw: { ...r.raw, PROOF: proofUrl || r.raw?.PROOF }
      }) : r));
      // Do not auto-change status; keep it as-is and inform the admin
      showPopup({ title: 'Proof uploaded', message: 'Image uploaded successfully. Status was not changed.', type: 'info' });
      // If not approved yet, give a hint about the next step
      const isApproved = String(selected.status || '').toLowerCase() === 'approved';
      if (!isApproved) {
        setProofError('Proof uploaded. Approve the appointment to mark as Successful.');
      }
      setProofFile(null);
    } catch (e) {
      console.error(e);
      const msg = String(e && e.code ? e.code : e?.message || e);
      if (msg.includes('storage/unauthorized')) {
        setProofError('Upload blocked by Storage Rules. Ensure you are signed in and have permission.');
      } else if (msg.includes('contentType') || msg.includes('image/')) {
        setProofError('Upload failed: only image files under 10MB are allowed.');
      } else {
        setProofError('Failed to upload proof.');
      }
    } finally {
      setProofUploading(false);
      setProofProgress(0);
    }
  };

  const filteredRows = useMemo(() => {
    const s = search.trim().toLowerCase();
    const from = dateFrom ? new Date(dateFrom) : null;
    const to = dateTo ? new Date(dateTo) : null;
    return rows.filter(r => {
      if (filterStatus && r.status !== filterStatus) return false;
      if (filterType && r.type !== filterType) return false;
      if (filterOverdue && !isRowOverdue(r)) return false;
      if (filterAttention && !isRowAttention(r)) return false;
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
  }, [rows, search, filterStatus, filterType, dateFrom, dateTo, filterOverdue, filterAttention]);

  // Clamp/reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [search, filterStatus, filterType, dateFrom, dateTo, filterOverdue, filterAttention]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(filteredRows.length / pageSize)), [filteredRows.length]);
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages]);

  const pageStart = (page - 1) * pageSize;
  const pageEnd = pageStart + pageSize;
  const pageRows = useMemo(() => filteredRows.slice(pageStart, pageEnd), [filteredRows, pageStart, pageEnd]);

  const clearFilters = () => {
    setSearch(''); setFilterStatus(''); setFilterType(''); setDateFrom(''); setDateTo(''); setDatePreset(''); setFilterOverdue(false); setFilterAttention(false);
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
            <option value="Successful">Successful</option>
          </select>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={filterOverdue}
              onChange={(e)=> setFilterOverdue(e.target.checked)}
              title="Show only overdue appointments"
            /> Overdue Only
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 600 }}>
            <input
              type="checkbox"
              checked={filterAttention}
              onChange={(e)=> setFilterAttention(e.target.checked)}
              title="Show pending or overdue"
            /> Needs Attention
          </label>
          <select className={styles.select} value={filterType} onChange={(e)=>setFilterType(e.target.value)}>
            <option value="">All Types</option>
            <option value="Service">Service</option>
            <option value="Package">Package</option>
          </select>
          <select
            className={styles.select}
            value={datePreset}
            onChange={(e)=>{
              const v = e.target.value;
              setDatePreset(v);
              if (!v) { /* manual control */ return; }
            }}
            title="Quick date filters"
          >
            <option value="">Custom dates</option>
            <option value="next7">Next 7 days</option>
            <option value="thismonth">This month (upcoming)</option>
          </select>
          <input
            type="date"
            className={styles.input}
            value={dateFrom}
            onChange={(e)=>{ setDateFrom(e.target.value); setDatePreset(''); }}
            placeholder="From"
          />
          <input
            type="date"
            className={styles.input}
            value={dateTo}
            onChange={(e)=>{ setDateTo(e.target.value); setDatePreset(''); }}
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
              <th className={styles.colDate}>Date</th>
              <th className={styles.colTime}>Time</th>
              <th className={styles.colStatus}>Status</th>
              <th className={styles.colActions}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => (
              <React.Fragment key={row.id}>
                <tr>
                  <td className={`${styles.cellEllipsis} ${styles.colPatient}`}>{row.patient}</td>
                  <td className={`${styles.cellEllipsis} ${styles.colEmail}`}>{row.email}</td>
                  <td className={styles.colAge}>{row.age}</td>
                  <td className={styles.colGender}>{row.gender}</td>
                  <td className={styles.colType}>{row.type}</td>
                  <td className={`${styles.colService}`} title={row.serviceName}>{row.serviceName}</td>
                  <td className={styles.colDate}>{row.dateDisplay || toLongDate(row.date)}</td>
                  <td className={styles.colTime}>{to12h(row.time)}</td>
                  <td className={styles.colStatus}>
                    <span
                      className={`${styles.status} ${
                        row.status === 'Approved'
                          ? styles.approved
                          : row.status === 'Declined'
                          ? styles.declined
                          : row.status === 'Successful'
                          ? styles.successful
                          : styles.pending
                      }`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className={`${styles.actions} ${styles.colActions}`}>
                    <button
                      className={`${styles.btn} ${styles.btnSecondary}`}
                      onClick={() => openModal(row.id)}
                      title={'Edit status / Show details'}
                    >
                      Edit Status
                    </button>
                  </td>
                </tr>
              </React.Fragment>
            ))}
          </tbody>
        </table>
      </div>
      {/* Pagination footer */}
      <div className={styles.paginationBar}>
        <div className={styles.range}>
          {filteredRows.length === 0
            ? 'Showing 0'
            : `Showing ${pageStart + 1}–${Math.min(pageEnd, filteredRows.length)} of ${filteredRows.length}`}
        </div>
        <div className={styles.pager}>
          <button
            className={`${styles.btn} ${styles.pageBtn}`}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Prev
          </button>
          {page < totalPages && (
            <button
              className={`${styles.btn} ${styles.btnApprove}`}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              title="Load more appointments"
            >
              Show More
            </button>
          )}
          <button
            className={`${styles.btn} ${styles.pageBtn}`}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next
          </button>
          <span className={styles.pageIndicator}>Page {page} of {totalPages}</span>
        </div>
      </div>
      {modalId && selected && (
        <div className={styles.modalOverlay} onClick={(e)=>{ if (e.target === e.currentTarget) closeModal(); }}>
          <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="apptModalTitle">
            <div className={styles.modalHeader}>
              <div className={styles.headerInfo}>
                <h3 id="apptModalTitle" className={styles.modalTitle}>{selected.patient || 'Appointment Details'}</h3>
                <div className={styles.headerSub}>{selected.serviceName} • {selected.dateDisplay || toLongDate(selected.date) || toLongDate(selected.raw?.DATE_OF_APPOINTMENT)} • {to12h(selected.time)}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span className={`${styles.status} ${selected.status === 'Approved' ? styles.approved : selected.status === 'Declined' ? styles.declined : selected.status === 'Successful' ? styles.successful : styles.pending}`}>{selected.status}</span>
                <button className={`${styles.btn} ${styles.btnDecline}`} onClick={closeModal} title="Close">✕</button>
              </div>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detailSection}>
                <div className={styles.detailTitle}>User Info</div>
                <div className={styles.detailGrid}>
                  <div><span>First Name</span><strong>{selected.raw.FIRST_NAME || '—'}</strong></div>
                  <div><span>Last Name</span><strong>{selected.raw.LAST_NAME || '—'}</strong></div>
                  <div><span>Phone</span><strong>{selected.raw.PHONE || '—'}</strong></div>
                  <div><span>Email</span><strong>{selected.raw.EMAIL || '—'}</strong></div>
                  <div><span>Birthday</span><strong>{selected.raw.BIRTHDAY || '—'}</strong></div>
                  <div><span>Gender</span><strong>{selected.raw.GENDER || '—'}</strong></div>
                </div>
              </div>
              <div className={styles.detailSection}>
                <div className={styles.detailTitle}>Service Info</div>
                <div className={styles.detailGrid}>
                  <div><span>Type</span><strong>{selected.type}</strong></div>
                  <div><span>Name</span><strong>{selected.serviceName}</strong></div>
                  <div><span>Service ID</span><strong>{selected.raw.SERVICE_ID || '—'}</strong></div>
                </div>
              </div>
              <div className={styles.detailSection}>
                <div className={styles.detailTitle}>Appointment Info</div>
                <div className={styles.detailGrid}>
                  <div><span>Date</span><strong>{selected.dateDisplay || toLongDate(selected.date) || toLongDate(selected.raw?.DATE_OF_APPOINTMENT)}</strong></div>
                  <div><span>Time</span><strong>{to12h(selected.time)}</strong></div>
                  <div><span>Status</span><strong>{selected.status}</strong></div>
                  {/* Decline reason (optional) */}
                  <div className={styles.fullRow}>
                    <span>Decline Reason (optional)</span>
                    <input
                      type="text"
                      className={styles.input}
                      placeholder="Short reason to include in the email (optional)"
                      value={declineReason}
                      onChange={(e)=>setDeclineReason(e.target.value)}
                      disabled={modalSaving || (String(modalStatus).toLowerCase() !== 'declined' && String(selected.status).toLowerCase() !== 'declined')}
                    />
                  </div>
                  <div><span>Chief Complaint</span><strong>{selected.raw.CHIEF_COMPLAINT || '—'}</strong></div>
                  <div className={styles.fullRow}><span>Special Instructions</span><strong>{selected.raw.SPECIAL_INSTRUCTIONS || '—'}</strong></div>
                  <div><span>Created</span><strong title={String(selected.raw.CREATED_AT || '')}>{toLongDateTime(selected.raw.CREATED_AT)}</strong></div>
                  <div><span>Updated</span><strong title={String(selected.raw.UPDATED_AT || '')}>{toLongDateTime(selected.raw.UPDATED_AT)}</strong></div>
                </div>
              </div>
              <div className={styles.detailSection}>
                <div className={styles.detailTitle}>Insert Proof</div>
                <div className={styles.detailGrid}>
                  <div className={styles.fullRow}>
                    <span>Current Proof</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      {selected.raw.PROOF || selected.raw.proof ? (
                        <>
                          <a href={(selected.raw.PROOF || selected.raw.proof)} target="_blank" rel="noreferrer">Open</a>
                          <img
                            src={(selected.raw.PROOF || selected.raw.proof)}
                            alt="Proof"
                            style={{ maxHeight: 80, borderRadius: 6, border: '1px solid #ddd' }}
                          />
                        </>
                      ) : (
                        <strong>—</strong>
                      )}
                    </div>
                  </div>
                  <div className={styles.fullRow}>
                    <span>Upload Image</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                        disabled={proofUploading}
                        className={styles.input}
                      />
                      <button
                        className={`${styles.btn} ${styles.btnApprove}`}
                        onClick={onUploadProof}
                        disabled={proofUploading || !proofFile}
                        title="Upload proof image"
                      >
                        {proofUploading ? `Uploading… ${proofProgress}%` : 'Insert Proof'}
                      </button>
                      {proofError ? <span className={styles.error} style={{ marginLeft: 8 }}>{proofError}</span> : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <span style={{ alignSelf: 'center', fontWeight: 700 }}>Change status:</span>
              <select
                className={styles.select}
                value={modalStatus}
                onChange={(e) => setModalStatus(e.target.value)}
                disabled={modalSaving}
              >
                <option>Approved</option>
                <option>Pending</option>
                <option>Declined</option>
                <option>Successful</option>
              </select>
              <button
                className={`${styles.btn} ${styles.btnApprove}`}
                onClick={onSubmitModalStatus}
                disabled={modalSaving}
                title="Submit status change and send email when applicable"
              >
                {modalSaving ? 'Submitting…' : 'Submit and Send Email'}
              </button>
              <div style={{ flex: 1 }}></div>
              <button className={`${styles.btn} ${styles.btnDelete}`} onClick={() => onDelete(selected.id)}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {popup.open && (
        <div className={styles.toastOverlay} role="dialog" aria-modal="true" aria-labelledby="toastTitle" onClick={(e)=>{ if (e.target === e.currentTarget) closePopup(); }}>
          <div className={styles.toastCard}>
            <div className={styles.toastHeader}>
              <div className={styles.toastIcon} aria-hidden>
                {popup.type === 'error' ? '!' : 'ℹ'}
              </div>
              <div className={styles.toastText}>
                <div id="toastTitle" className={styles.toastTitle}>{popup.title || 'Notice'}</div>
                {popup.message && (<div className={styles.toastMsg}>{popup.message}</div>)}
              </div>
              <button type="button" className={styles.toastClose} onClick={closePopup} title="Close">✕</button>
            </div>
          </div>
        </div>
      )}

      {confirmSend.open && (
        <div className={styles.toastOverlay} role="dialog" aria-modal="true" aria-labelledby="confirmTitle" onClick={(e)=>{ if (e.target === e.currentTarget) setConfirmSend({ open:false, onConfirm:null, title:'', message:'' }); }}>
          <div className={styles.toastCard}>
            <div className={styles.toastHeader}>
              <div className={styles.toastIcon} aria-hidden>ℹ</div>
              <div className={styles.toastText}>
                <div id="confirmTitle" className={styles.toastTitle}>{confirmSend.title || 'Send email?'}</div>
                <div className={styles.toastMsg}>{confirmSend.message || 'Do you want to send an email notification now?'}</div>
              </div>
              <button type="button" className={styles.toastClose} onClick={() => setConfirmSend({ open:false, onConfirm:null, title:'', message:'' })} title="Close">✕</button>
            </div>
            <div style={{ display:'flex', gap:8, justifyContent:'flex-end', padding:'0 16px 14px' }}>
              <button className={`${styles.btn} ${styles.btnDecline}`} onClick={() => setConfirmSend({ open:false, onConfirm:null, title:'', message:'' })}>Cancel</button>
              <button className={`${styles.btn} ${styles.btnApprove}`} onClick={() => confirmSend.onConfirm && confirmSend.onConfirm()}>Send</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

