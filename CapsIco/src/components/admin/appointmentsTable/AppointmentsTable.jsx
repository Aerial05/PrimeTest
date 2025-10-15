import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useToast } from '@/components/shared/toast/ToastProvider.jsx';
import styles from './AppointmentsTable.module.css';
import appointmentsService from '@/services/AppointmentsService';
import { usersDB } from '/src/config/firebase-config';
import { ref as dbRef, push as dbPush, update as dbUpdate, get as dbGet } from 'firebase/database';
import { buildAppointmentEmail } from '@/utils/appointmentEmailTemplate.js';
import servicePackagesService from '@/services/ServicePackagesService';
import singleServicesService from '@/services/SingleServicesService';
import { useLocation } from 'react-router-dom';

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
  if (v === 'rescheduled') return 'Approved Reschedule';
  if (v === 'approved') return 'Approved';
  if (v === 'declined') return 'Declined';
  if (v === 'successful') return 'Successful';
  if (v === 'cancelled' || v === 'canceled') return 'Cancelled';
  return 'Pending';
}

export function AppointmentsTable({ refreshKey = 0, initialFilterStatus = '', initialOverdue = false, initialAttention = false, initialExcludeResched = false }) {
  // Toggle whether proof is required to mark an appointment as Successful
  const requireProofForSuccess = true;
  const [rows, setRows] = useState([]);
  // Toast notifications (replace inline overlay popups)
  const { show: showToast } = useToast();
  const showPopup = ({ title = 'Notice', message = '', type = 'info', duration = 3500 } = {}) => {
    showToast({
      type: type === 'error' ? 'error' : 'success',
      title,
      message,
      duration
    });
  };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalId, setModalId] = useState(null);
  const [modalStatus, setModalStatus] = useState('');
  const [modalSaving, setModalSaving] = useState(false);
  // Decline reason (optional)
  const [declineReason, setDeclineReason] = useState('');
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [pendingDeclineStage, setPendingDeclineStage] = useState(null);
  // (Removed legacy confirm overlay state)
  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 8;
  // Filters / search
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState(''); // '', Approved, Pending, Declined
  const [filterType, setFilterType] = useState(''); // '', Service, Package
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [datePreset, setDatePreset] = useState(''); // '', next7, thismonth
  const [filterOverdue, setFilterOverdue] = useState(initialOverdue);
  const [filterAttention, setFilterAttention] = useState(initialAttention);
  const [excludeResched, setExcludeResched] = useState(initialExcludeResched);
  // Track last applied URL search to avoid stale filters; but we will re-apply on each change
  const [lastSearchSig, setLastSearchSig] = useState('');
  const location = useLocation();
  // Insert Proof state
  const [proofFile, setProofFile] = useState(null);
  const [proofUploading, setProofUploading] = useState(false);
  const [proofError, setProofError] = useState('');
  const [proofProgress, setProofProgress] = useState(0);
  // Email throttle state (per appointment)
  const emailSentAtRef = useRef({});
  const EMAIL_COOLDOWN_MS = 10_000; // 10 seconds to prevent rapid repeats
  // (Removed confirmSending; handled by toast action async state inside provider)
  // (Automation removed: no auto toggles / background processing)

  const openModal = (id) => setModalId(id);
  const closeModal = () => setModalId(null);
  const selected = useMemo(() => rows.find(r => r.id === modalId), [rows, modalId]);
  // View-only mode for cancelled appointments
  const isCancelled = String(selected?.status || '').toLowerCase() === 'cancelled';

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
        // Determine status label with reschedule-aware override
        let baseStatus = toStatusLabel(r.BOOKING_STATUS);
        const hasResUI = Boolean(r.RESCHEDULE_INFO || r.rescheduleInfo || r.RESCHEDULED_AT);
        const rawStatusLower = String(r.BOOKING_STATUS || '').trim().toLowerCase();
        if (hasResUI) {
          if (baseStatus === 'Pending') baseStatus = 'Pending Reschedule';
          // When an appointment has a reschedule request and was previously approved or
          // the raw status is 'rescheduled', show the actionable 'Approve Reschedule'
          // stage so that after approval the UI reflects the completed action.
          if (baseStatus === 'Approved' || baseStatus === 'Successful' || rawStatusLower === 'rescheduled') baseStatus = 'Approve Reschedule';
        }
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
          status: baseStatus,
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
      try {
        const { from, to, range, overdue, attention, excludeResched: exr } = e.detail || {};
        const preset = typeof range === 'string' ? range.toLowerCase() : '';
        if (preset === 'next7' || preset === 'thismonth') {
          setDatePreset(preset);
          // Clear explicit dates; preset effect will populate them
          setDateFrom('');
          setDateTo('');
        } else {
          setDatePreset('');
          setDateFrom(from ?? '');
          setDateTo(to ?? '');
        }
        setFilterOverdue(Boolean(overdue));
        setFilterAttention(Boolean(attention));
        setExcludeResched(Boolean(exr));
      } catch(_) { /* ignore */ }
    };
    window.addEventListener('appointments:set-initial-dates', onInitDates);
    return () => window.removeEventListener('appointments:set-initial-dates', onInitDates);
  }, []);

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
    // Create a signature of the relevant params to detect changes
    const sig = location.search || '';
    if (sig === lastSearchSig) return;
    setLastSearchSig(sig);
    // status
    const qStatus = (qs.get('status') || '').toLowerCase();
    const map = {
      approved: 'Approved',
      pending: 'Pending',
      'pending-reschedule': 'Pending Reschedule',
      'approved-reschedule': 'Approved Reschedule',
      rescheduled: 'Rescheduled (Any)',
      declined: 'Declined',
      successful: 'Successful',
    };
    const statusVal = map[qStatus] || '';
    setFilterStatus(statusVal);
    // range preset
    const qRange = (qs.get('range') || '').toLowerCase();
    if (qRange === 'next7' || qRange === 'thismonth') {
      setDatePreset(qRange);
    } else {
      // explicit dates
      const from = qs.get('from');
      const to = qs.get('to');
      setDatePreset('');
      setDateFrom(from || '');
      setDateTo(to || '');
    }
    // Overdue / attention flags
    const qOverdue = qs.get('overdue');
    setFilterOverdue(qOverdue === '1');
    const qAttention = qs.get('attention');
    setFilterAttention(qAttention === '1');
    const qExRes = qs.get('excludeResched');
    setExcludeResched(qExRes === '1');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, lastSearchSig]);

  const setStatusLocal = (id, status) =>
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));

  // --- Email helper abstraction & cooldown support ---
  // Build payload for callable based on current selection & backend status
  const buildEmailPayload = (row, backend, declineReasonParam) => {
    if (!row) return null;
    const resched = row.raw?.RESCHEDULE_INFO;
    const statusRaw = backend;
    const effectiveStatus = statusRaw === 'rescheduled' ? 'approved' : statusRaw; // for template wording
    const date = (resched?.newDate || row.date || row.raw?.DATE_OF_APPOINTMENT);
    const time = (resched?.newTime || row.time || row.raw?.TIME_SLOT);
    return {
      apptId: row.id,
      status: effectiveStatus,
      serviceName: row.serviceName,
      serviceType: row.type,
      date,
      time,
      declineReason: (statusRaw === 'declined' && declineReasonParam) ? declineReasonParam : undefined,
      rawStatus: statusRaw,
      record: { ...row.raw },
    };
  };

  const [cooldownTick, setCooldownTick] = useState(0); // periodic update driver
  useEffect(() => {
    if (!modalId) return; // only tick when a modal is open
    const id = setInterval(() => setCooldownTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, [modalId]);
  const getCooldownRemainingMs = (rowId) => {
    const last = emailSentAtRef.current[rowId] || 0;
    const rem = EMAIL_COOLDOWN_MS - (Date.now() - last);
    return rem > 0 ? rem : 0;
  };
  const fmtSeconds = (ms) => Math.ceil(ms / 1000);

  const sendStatusEmail = async ({ row, backend, labelStatus, declineReasonParam }) => {
    if (!row) return { ok: false, error: 'No row selected' };
    const remaining = getCooldownRemainingMs(row.id);
    if (remaining > 0) {
      showPopup({ title: 'Please wait', message: `Email was just sent. Try again in ${fmtSeconds(remaining)}s.`, type: 'info' });
      return { ok: false, error: 'cooldown' };
    }
    const payload = buildEmailPayload(row, backend, declineReasonParam);
    if (!payload) return { ok: false, error: 'payload' };
    try {
      // Fetch fresh snapshot to ensure we have service name etc.
      let snap = null;
      try { snap = await dbGet(dbRef(usersDB, `appointments/${row.id}`)); } catch(_) {}
      const rec = snap && snap.exists() ? (snap.val() || {}) : (payload.record || {});
      // Build branded template (frontend mirror of backend) using fresh record merged with overrides
      const merged = {
        ...rec,
        SERVICE_NAME: payload.serviceName || rec.SERVICE_NAME,
        SERVICE_TYPE: (payload.serviceType || rec.SERVICE_TYPE),
        DATE_OF_APPOINTMENT: payload.date || rec.DATE_OF_APPOINTMENT,
        TIME_SLOT: payload.time || rec.TIME_SLOT,
        BOOKING_STATUS: payload.rawStatus || payload.status || rec.BOOKING_STATUS,
      };
      if (payload.declineReason) merged.DECLINE_REASON = payload.declineReason;
      const { subject, html, text } = buildAppointmentEmail({ record: merged, effectiveStatus: payload.rawStatus || payload.status });
      await dbPush(dbRef(usersDB, 'emailQueue'), { to: rec.EMAIL || row.email, subject, html, text });
      emailSentAtRef.current[row.id] = Date.now();
      showPopup({ title: 'Email queued', message: `Notification queued before status change to “${labelStatus}”.`, type: 'info' });
      return { ok: true };
    } catch (e) {
      console.warn('[sendStatusEmail] enqueue failed', e);
      showPopup({ title: 'Email failed', message: 'Failed to queue email notification.', type: 'error' });
      return { ok: false, error: e?.message || 'error' };
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
    // Legacy handler no longer used (replaced by flow stepper). Kept for fallback.
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
      // If not yet at an approved-like stage, show a hint; otherwise no warning
      const statusNow = String(selected.status || '');
      const approvedLikeNow = (
        statusNow === 'Approved' ||
        statusNow === 'Approve Reschedule' ||
        statusNow === 'Approved Reschedule' ||
        statusNow === 'Successful'
      );
      if (!approvedLikeNow) {
        setProofError('Proof uploaded. Approve or Approve Reschedule to mark as Successful.');
      }
      setProofFile(null);
    } catch (e) {
      console.error(e);
      const code = String(e?.code || '').toLowerCase();
      const message = String(e?.message || e || '').toLowerCase();
      if (code.includes('storage/unauthorized') || code.includes('unauthorized')) {
        setProofError('Upload blocked by Storage Rules. Please sign in and try again.');
      } else if (message.includes('max 10mb') || message.includes('larg') || message.includes('size')) {
        setProofError('Upload failed: file too large. Max 10MB.');
      } else if (message.includes('image') || message.includes('contenttype')) {
        setProofError('Upload failed: only image files (JPG/PNG/WEBP) are allowed.');
      } else {
        setProofError('Failed to upload proof. Please try again.');
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
      const hasRes = Boolean(r.raw?.RESCHEDULE_INFO || r.raw?.rescheduleInfo || r.raw?.RESCHEDULED_AT);
      const statusLower = String(r.status || '').toLowerCase();
      const rawStatusLower = String(r.raw?.BOOKING_STATUS || '').trim().toLowerCase();
      const isPendingRaw = rawStatusLower === 'pending';
      // Special handling for reschedule-focused filters
      if (filterStatus === 'Pending Reschedule') {
        const labelIsPendingRes = statusLower === 'pending reschedule';
        if (!((labelIsPendingRes) || (isPendingRaw && hasRes))) return false;
      } else if (filterStatus === 'Approved Reschedule') {
  const labelIsApprovedRes = statusLower === 'approved reschedule' || statusLower === 'approve reschedule';
        const isApprovedLike = (statusLower === 'approved' || statusLower === 'successful');
        const isRescheduledRaw = rawStatusLower === 'rescheduled';
        // Ensure it's not pending when counting raw rescheduled (avoid overlap)
        if (!(labelIsApprovedRes || (isApprovedLike && hasRes) || (isRescheduledRaw && rawStatusLower !== 'pending'))) return false;
      } else if (filterStatus === 'Rescheduled (Any)') {
        if (!(hasRes || rawStatusLower === 'rescheduled')) return false;
      } else {
        if (filterStatus && r.status !== filterStatus) return false;
      }
      // Exclude rescheduled rows from generic Pending/Attention scopes when requested
      if (excludeResched) {
        if (filterStatus === '' || filterStatus === 'Pending') {
          if ((statusLower === 'pending' || statusLower === 'pending reschedule') && hasRes) return false;
        }
      }
      if (filterType && r.type !== filterType) return false;
      if (filterOverdue && !isRowOverdue(r)) return false;
      if (filterAttention) {
        const isPendingLike = (statusLower === 'pending' || statusLower === 'pending reschedule' || rawStatusLower === 'pending');
        const isAttention = ((isPendingLike && !(excludeResched && hasRes)) || isRowOverdue(r));
        if (!isAttention) return false;
      }
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

  // (Automation helpers removed)

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
            <option value="Pending Reschedule">Pending Reschedule</option>
            <option value="Approved Reschedule">Approved Reschedule</option>
            <option value="Rescheduled (Any)">Rescheduled (Any)</option>
            <option value="Declined">Declined</option>
            <option value="Successful">Successful</option>
            <option value="Cancelled">Cancelled</option>
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
            <option value="next7">Next 7 Days</option>
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
        <div className={styles.meta}>{pageRows.length} / {filteredRows.length} shown</div>
      </div>
      {/* Automation removed */}
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
              <th className={styles.colAge}>Age</th>
              <th className={styles.colGender}>Gender</th>
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
                  <td className={styles.colAge}>{row.age}</td>
                  <td className={styles.colGender}>{row.gender}</td>
                  <td className={`${styles.colService}`} title={row.serviceName}>{row.serviceName}</td>
                  <td className={styles.colDate}>{row.dateDisplay || toLongDate(row.date)}</td>
                  <td className={styles.colTime}>{to12h(row.time)}</td>
                  <td className={styles.colStatus}>
                    <span className={styles.statusGroup}>
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
                        title={
                          String(row.status).toLowerCase() === 'cancelled'
                            ? (row.raw?.CANCELLATION?.reason || row.raw?.CANCEL_INFO?.reason || row.raw?.CANCEL_REASON || 'Cancelled')
                            : undefined
                        }
                      >
                        {row.status}
                      </span>
                      {row.raw?.RESCHEDULE_INFO ? (
                        <>
                          <span aria-hidden style={{ margin: '0 6px', color: '#cbd5e1' }}>•</span>
                          <span
                            className={styles.reschedBadge}
                            title={`Rescheduled: ${toLongDate(row.raw?.RESCHEDULE_INFO?.oldDate || row.date)} ${row.raw?.RESCHEDULE_INFO?.oldTime ? '• ' + to12h(row.raw?.RESCHEDULE_INFO?.oldTime) : ''} → ${toLongDate(row.raw?.RESCHEDULE_INFO?.newDate || row.date)} ${row.raw?.RESCHEDULE_INFO?.newTime ? '• ' + to12h(row.raw?.RESCHEDULE_INFO?.newTime) : ''}`}
                          >
                            Rescheduled
                          </span>
                        </>
                      ) : null}
                      {(['Pending','Approved'].includes(row.status) && isRowOverdue(row)) ? (
                        <>
                          <span aria-hidden style={{ margin: '0 6px', color: '#cbd5e1' }}>•</span>
                          <span className={styles.overdueBadge} title="This appointment is past its scheduled date/time">Overdue</span>
                        </>
                      ) : null}
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
                {(() => {
                  const raw = selected.raw || {};
                  const flags = raw.EMAIL_SENT_APPROVED || raw.EMAIL_SENT_DECLINED || raw.EMAIL_SENT_SUCCESSFUL;
                  const recently = getCooldownRemainingMs(selected.id) > 0;
                  if (!flags && !recently) return null;
                  const cls = recently ? styles.emailBadge + ' ' + styles.cooldown : styles.emailBadge;
                  const label = recently ? `Email queued (${Math.ceil(getCooldownRemainingMs(selected.id)/1000)}s)` : 'Email Sent';
                  return <span className={cls} title={recently ? 'Email just queued; waiting before another send' : 'An email was already sent for this status'}>✉ {label}</span>;
                })()}
                {(['Pending','Approved'].includes(selected.status) && isRowOverdue(selected)) ? (
                  <span className={styles.overdueBadge} title="This appointment is past its scheduled date/time">Overdue</span>
                ) : null}
                <button className={`${styles.btn} ${styles.btnDecline}`} onClick={closeModal} title="Close">✕</button>
              </div>
            </div>
            <div className={styles.modalBody}>
              <div className={styles.detailSection}>
                <div className={styles.detailTitle}>User Info</div>
                <div className={styles.detailGrid}>
                  <div><span>First Name</span><strong>{selected.raw.FIRST_NAME || '—'}</strong></div>
                  <div><span>Last Name</span><strong>{selected.raw.LAST_NAME || '—'}</strong></div>
                  <div><span>Email</span><strong>{selected.raw.EMAIL || '—'}</strong></div>
                  <div><span>Phone</span><strong>{selected.raw.PHONE || '—'}</strong></div>
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
              <div className={`${styles.detailSection} ${styles.appointmentSection}`}>
                <div className={styles.detailTitle}>Appointment Details</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                  <div className={styles.detailGrid} style={{ marginBottom: 0 }}>
                    <div><span>Date</span><strong>{selected.dateDisplay || toLongDate(selected.date) || toLongDate(selected.raw?.DATE_OF_APPOINTMENT)}</strong></div>
                    <div><span>Time</span><strong>{to12h(selected.time)}</strong></div>
                    <div><span>Status</span><strong>{selected.status}</strong></div>
                  </div>
                  {selected.raw?.RESCHEDULE_INFO && (
                    <div className={styles.detailGrid} style={{ marginBottom: 0 }}>
                      <div><span>Reschedule From</span><strong>{toLongDate(selected.raw?.RESCHEDULE_INFO?.oldDate || selected.raw?.DATE_OF_APPOINTMENT)} • {to12h(selected.raw?.RESCHEDULE_INFO?.oldTime || selected.raw?.TIME_SLOT)}</strong></div>
                      <div><span>Reschedule To</span><strong>{toLongDate(selected.raw?.RESCHEDULE_INFO?.newDate || selected.raw?.DATE_OF_APPOINTMENT)} • {to12h(selected.raw?.RESCHEDULE_INFO?.newTime || selected.raw?.TIME_SLOT)}</strong></div>
                      {selected.raw?.RESCHEDULE_INFO?.reason && (
                        <div>
                          <span>Reschedule Reason</span>
                          <strong style={{ fontSize: '13px', lineHeight: '1.5', display: 'block' }}>{selected.raw?.RESCHEDULE_INFO?.reason}</strong>
                          <em style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginTop: '2px' }}>Why the user requested the change</em>
                        </div>
                      )}
                    </div>
                  )}
                  {String(selected.status).toLowerCase() === 'cancelled' ? (
                    <div className={styles.detailGrid} style={{ marginBottom: 0 }}>
                      <div>
                        <span>Cancellation Reason</span>
                        <strong>{(selected.raw?.CANCELLATION?.reason || selected.raw?.CANCEL_INFO?.reason || selected.raw?.CANCEL_REASON || '—')}</strong>
                      </div>
                      <div>
                        <span>Cancelled At</span>
                        <strong>{toLongDateTime(selected.raw?.CANCELLATION?.at || selected.raw?.UPDATED_AT)}</strong>
                      </div>
                    </div>
                  ) : null}
                  <div className={styles.detailGrid} style={{ marginBottom: 0 }}>
                    <div><span>Created</span><strong>{toLongDateTime(selected.raw.CREATED_AT)}</strong></div>
                    <div><span>Updated</span><strong>{toLongDateTime(selected.raw.UPDATED_AT)}</strong></div>
                  </div>
                  <div className={styles.detailGrid} style={{ marginBottom: 0 }}>
                    <div>
                      <span>Chief Complaint</span>
                      <strong style={{ fontSize: '13px', lineHeight: '1.5' }}>{selected.raw.CHIEF_COMPLAINT || '—'}</strong>
                    </div>
                    <div>
                      <span>Special Instructions</span>
                      <strong style={{ fontSize: '13px', lineHeight: '1.5' }}>{selected.raw.SPECIAL_INSTRUCTIONS || '—'}</strong>
                    </div>
                  </div>
                </div>
              </div>
              {/* Decline Reason - for easy status editing */}
              <div className={`${styles.detailSection} ${styles.appointmentSection}`}>
                <div className={styles.detailTitle}>Decline Reason (Optional)</div>
                <textarea
                  className={styles.textarea}
                  placeholder="Enter reason for declining (will be included in email)"
                  value={declineReason}
                  onChange={(e)=>setDeclineReason(e.target.value)}
                  disabled={isCancelled || modalSaving || (String(modalStatus).toLowerCase() !== 'declined' && String(selected.status).toLowerCase() !== 'declined')}
                  style={{ minHeight: '70px', fontSize: '13px', opacity: isCancelled ? 0.6 : 1 }}
                />
              </div>
              {/* Insert Proof - moved to bottom */}
              <div className={`${styles.detailSection} ${styles.proofSection}`}>
                <div className={styles.detailTitle}>Insert Proof</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '16px', alignItems: 'start' }}>
                  <div>
                    <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Current Proof</span>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px', minHeight: '100px', minWidth: '120px' }}>
                      {selected.raw.PROOF || selected.raw.proof ? (
                        <div style={{ textAlign: 'center' }}>
                          <img
                            src={(selected.raw.PROOF || selected.raw.proof)}
                            alt="Proof"
                            style={{ maxHeight: 80, maxWidth: 120, borderRadius: 6, border: '1px solid #ddd', display: 'block', marginBottom: '8px' }}
                          />
                          <a href={(selected.raw.PROOF || selected.raw.proof)} target="_blank" rel="noreferrer" style={{ fontSize: '11px', color: '#2563eb', textDecoration: 'underline' }}>View Full</a>
                        </div>
                      ) : (
                        <strong style={{ fontSize: '12px', color: '#9ca3af' }}>No proof</strong>
                      )}
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '11px', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Upload New</span>
                    <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '14px' }}>
                      <div style={{ marginBottom: '10px', maxWidth: '280px', position: 'relative' }}>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                          disabled={proofUploading || isCancelled}
                          id="proofFileInput"
                          style={{ 
                            position: 'absolute',
                            opacity: 0,
                            width: '1px',
                            height: '1px',
                            cursor: 'pointer',
                            pointerEvents: 'none',
                            zIndex: -1
                          }}
                        />
                        <label 
                          htmlFor="proofFileInput"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '10px 14px',
                            background: '#fff',
                            border: '2px dashed #d1d5db',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            fontSize: '13px',
                            color: '#6b7280',
                            fontWeight: 600,
                            whiteSpace: 'nowrap',
                            opacity: isCancelled ? 0.6 : 1,
                            pointerEvents: isCancelled ? 'none' : 'auto'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#2563eb';
                            e.currentTarget.style.background = '#f0f9ff';
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#d1d5db';
                            e.currentTarget.style.background = '#fff';
                          }}
                        >
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>
                          </svg>
                          Choose Image
                        </label>
                        {proofFile && (
                          <div style={{ fontSize: '11px', color: '#6b7280', marginTop: '6px', fontStyle: 'italic' }}>
                            Selected: {proofFile.name}
                          </div>
                        )}
                      </div>
                      <button
                        className={`${styles.btn} ${styles.btnApprove}`}
                        onClick={onUploadProof}
                        disabled={proofUploading || !proofFile || isCancelled}
                        style={{ padding: '10px 16px', fontSize: '13px', maxWidth: '180px', fontWeight: 700 }}
                      >
                        {proofUploading ? `Uploading ${proofProgress}%` : 'Upload Proof'}
                      </button>
                      {proofError ? <div style={{ fontSize: '11px', color: '#dc2626', marginTop: 8, padding: '6px 8px', background: '#fef2f2', borderRadius: '6px', maxWidth: '400px' }}>{proofError}</div> : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
            <div className={styles.modalFooter}>
              <div style={{ display:'flex', flexDirection:'column', flex:1, gap:6 }}>
                <div style={{ fontSize: '13px', fontWeight:700, display:'flex', alignItems:'center', gap:8 }}>
                  Status Flow
                  {isCancelled && (
                    <span style={{
                      fontSize: 12,
                      fontWeight: 800,
                      color: '#b91c1c',
                      background: '#fee2e2',
                      border: '1px solid #fecaca',
                      borderRadius: 999,
                      padding: '4px 8px'
                    }} title="This appointment is cancelled and cannot be edited">Cancelled — view only</span>
                  )}
                </div>
                {(() => {
                  const current = selected.status; // Friendly label already
                  const rawStatusLower = String(selected.raw?.BOOKING_STATUS || '').toLowerCase();
                  const hasRes = Boolean(selected.raw?.RESCHEDULE_INFO || selected.raw?.rescheduleInfo || selected.raw?.RESCHEDULED_AT);
                  const proofProvided = !!(selected.raw?.PROOF || selected.raw?.proof);
                  // Define phases dynamically per requested flows:
                  // 1) Pending -> Approved (email) / Decline (email) -> Successful (needs proof, email)
                  // 2) Pending -> Approved (email) -> Approved Reschedule (user) -> Approve Reschedule (email) / Decline (email) -> Successful (needs proof, email)
                  // 3) Pending -> Pending Reschedule (user) -> Approve Reschedule (email) / Decline (email) -> Successful (needs proof, email)
                  const stages = [];
                  const push = (key,label,opts={}) => stages.push({ key, label, ...opts });
                  // Always start with Pending conceptual stage
                  push('pending','Pending');
                  const priorApproved = Boolean(selected.raw?.EMAIL_SENT_APPROVED || selected.raw?.RESCHEDULED_AT);
                  const scenarioHasRes = hasRes;
                  if (scenarioHasRes) {
                    if (current === 'Pending Reschedule') {
                      // Ensure current stage exists when user rescheduled while pending
                      push('pending-res','Pending Reschedule', { requiresEmail:false });
                      push('approved-res','Approve Reschedule', { requiresEmail:true, emailType:'approved-reschedule' });
                    } else if (priorApproved) {
                      // Reschedule on an approved appointment
                      push('approved','Approved', { requiresEmail:true, emailType:'approved' });
                      // Show review step distinctly, then actionable Approve Reschedule
                      push('approved-res-review','Approved Reschedule', { requiresEmail:false });
                      push('approved-res','Approve Reschedule', { requiresEmail:true, emailType:'approved-reschedule' });
                    } else {
                      // Fallback: treat as pending-reschedule path
                      push('pending-res','Pending Reschedule', { requiresEmail:false });
                      push('approved-res','Approve Reschedule', { requiresEmail:true, emailType:'approved-reschedule' });
                    }
                  } else {
                    // Flow 1: straight path
                    push('approved','Approved', { requiresEmail:true, emailType:'approved' });
                  }
                  // Decline allowed from Pending, Pending Reschedule, and Approve Reschedule (but not after final approval/success)
                  if (['Pending','Pending Reschedule','Approved Reschedule','Approve Reschedule'].includes(current)) {
                    push('declined','Declined', { requiresEmail:true, emailType:'declined' });
                  }
                  // Successful stage (needs proof & must have been approved)
                  push('successful','Successful', { requiresProof:true, requiresEmail:true, emailType:'successful' });

                  const labelToKey = (lbl) => lbl.toLowerCase().replace(/\s+/g,'-');
                  const currentKey = labelToKey(current);
                  const completedIndex = stages.findIndex(s => labelToKey(s.label) === currentKey);
                  const canTransition = (target, idx) => {
                    if (isCancelled) return false;
                    if (completedIndex === -1) return false;
                    // Only allow forward (idx > completedIndex)
                    if (idx <= completedIndex) return false;
                    // Enforce order: skip rules: cannot jump more than one ahead unless skipping decline branch
                    if (target.key === 'declined') {
                      // allowed only if at Pending, Pending Reschedule, or Approve Reschedule stage
                      if (!['Pending','Pending Reschedule','Approved Reschedule','Approve Reschedule'].includes(current)) return false;
                    }
                    // Prevent manual advancement to Pending Reschedule (user-driven)
                    if (target.key === 'pending-res') return false;
                    // successful requires prior Approved (or Approve Reschedule) and proof
                    if (target.key === 'successful') {
                      const approvedLike = (
                        current === 'Approved' ||
                        current === 'Approve Reschedule' ||
                        current === 'Approved Reschedule' ||
                        current === 'Successful'
                      );
                      if (!approvedLike) return false;
                      if (requireProofForSuccess && !proofProvided) return false;
                    }
                    return true;
                  };

                  const handleTransition = async (stage, idx) => {
                    if (!canTransition(stage, idx) || modalSaving) return;
                    if (stage.key === 'declined') {
                      setPendingDeclineStage({ stage, idx });
                      setShowDeclineModal(true);
                      return;
                    }
                    // Map stage keys to backend
                    const backendMap = {
                      'pending':'pending',
                      'pending-res':'pending', // DB status remains pending; RESCHEDULE_INFO marks intent
                      'approved-res-review': null, // review step only, no backend status change
                      'approved-res':'rescheduled', // treat this as "rescheduled/approved"
                      'approved':'approved',
                      'declined':'declined',
                      'successful':'successful'
                    };
                    const backend = backendMap[stage.key];
                    if (stage.key === 'approved-res-review') {
                      // purely a UI step, no email/status change
                      setStatusLocal(selected.id, stage.label);
                      return;
                    }
                    // Email required? send first; only update status after success
                    const needsEmail = stage.requiresEmail;
                    const declineReasonParam = stage.key === 'declined' ? declineReason : undefined;
                    try {
                      setModalSaving(true);
                      if (needsEmail) {
                        const emailRes = await sendStatusEmail({ row: selected, backend, labelStatus: stage.label, declineReasonParam });
                        if (!emailRes.ok) {
                          setModalSaving(false);
                          return;
                        }
                      }
                      // For successful also ensure proof
                      if (stage.key === 'successful' && requireProofForSuccess && !proofProvided) {
                        showPopup({ title:'Proof required', message:'Upload proof before marking Successful.', type:'error' });
                        setModalSaving(false);
                        return;
                      }
                      // Update status + set email sent flags (mimic callable side-effects) to avoid duplicate trigger emails
                      const emailFlag = (() => {
                        if (backend === 'approved' || backend === 'rescheduled') return { EMAIL_SENT_APPROVED: true };
                        if (backend === 'successful') return { EMAIL_SENT_SUCCESSFUL: true };
                        if (backend === 'declined') return { EMAIL_SENT_DECLINED: true };
                        return {};
                      })();
                      await appointmentsService.updateStatus(selected.id, backend, emailFlag);
                      setStatusLocal(selected.id, stage.label);
                    } catch (e) {
                      showPopup({ title:'Update failed', message:'Failed to update status.', type:'error' });
                    } finally {
                      setModalSaving(false);
                    }
                  };

                  return (
                    <div>
                      {showDeclineModal && pendingDeclineStage && (
                        <div className={styles.backdrop} style={{ position:'fixed', inset:0, background:'rgba(15,23,42,0.55)', backdropFilter:'blur(2px)', display:'flex', alignItems:'center', justifyContent:'center', zIndex: 4000 }}>
                          <div style={{ background:'#ffffff', width:'100%', maxWidth:480, borderRadius:16, boxShadow:'0 10px 40px -5px rgba(0,0,0,0.25)', padding:'22px 26px', display:'flex', flexDirection:'column', gap:16 }}>
                            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                              <h2 style={{ margin:0, fontSize:18, fontWeight:800, color:'#0f172a' }}>Decline Appointment</h2>
                              <button onClick={()=>{ setShowDeclineModal(false); setPendingDeclineStage(null); }} style={{ background:'transparent', border:0, fontSize:18, cursor:'pointer', lineHeight:1 }}>✕</button>
                            </div>
                            <p style={{ margin:0, fontSize:13, lineHeight:1.5, color:'#334155' }}>You are about to decline this appointment. An email notification will be sent to the user. Optionally provide a reason below (included in the email).</p>
                            <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                              <label htmlFor="declineReasonInput" style={{ fontSize:11, fontWeight:700, letterSpacing:'.05em', textTransform:'uppercase', color:'#64748b' }}>Reason (optional)</label>
                              <textarea
                                id="declineReasonInput"
                                value={declineReason}
                                onChange={(e)=>setDeclineReason(e.target.value)}
                                placeholder="e.g. Incomplete information, schedule conflict, etc."
                                style={{ resize:'vertical', minHeight:90, padding:'10px 12px', fontSize:13, border:'1px solid #cbd5e1', borderRadius:8, outline:'none', boxShadow:'0 0 0 1px rgba(0,0,0,0.02)'}}
                              />
                            </div>
                            <div style={{ display:'flex', justifyContent:'flex-end', gap:12, marginTop:4 }}>
                              <button
                                onClick={()=>{ setShowDeclineModal(false); setPendingDeclineStage(null); }}
                                style={{ background:'#f1f5f9', color:'#475569', fontWeight:600, border:'1px solid #cbd5e1', padding:'8px 14px', borderRadius:8, fontSize:13, cursor:'pointer' }}
                                disabled={modalSaving}
                              >Cancel</button>
                              <button
                                onClick={async ()=>{
                                  if (!pendingDeclineStage) return;
                                  const { stage, idx } = pendingDeclineStage;
                                  setShowDeclineModal(false);
                                  setPendingDeclineStage(null);
                                  // Continue decline flow now
                                  const backendMap = {
                                    'pending':'pending',
                                    'pending-res':'pending',
                                    'approved-res':'rescheduled',
                                    'approved':'approved',
                                    'declined':'declined',
                                    'successful':'successful'
                                  };
                                  const backend = backendMap[stage.key];
                                  const needsEmail = stage.requiresEmail;
                                  const declineReasonParam = declineReason || undefined;
                                  try {
                                    setModalSaving(true);
                                    if (needsEmail) {
                                      const emailRes = await sendStatusEmail({ row: selected, backend, labelStatus: stage.label, declineReasonParam });
                                      if (!emailRes.ok) { setModalSaving(false); return; }
                                    }
                                    const emailFlag = (() => {
                                      if (backend === 'approved' || backend === 'rescheduled') return { EMAIL_SENT_APPROVED: true };
                                      if (backend === 'successful') return { EMAIL_SENT_SUCCESSFUL: true };
                                      if (backend === 'declined') return { EMAIL_SENT_DECLINED: true };
                                      return {};
                                    })();
                                    await appointmentsService.updateStatus(selected.id, backend, emailFlag);
                                    setStatusLocal(selected.id, stage.label);
                                  } catch (e) {
                                    showPopup({ title:'Update failed', message:'Failed to update status.', type:'error' });
                                  } finally {
                                    setModalSaving(false);
                                  }
                                }}
                                className={styles.btn}
                                style={{ background:'#dc2626', color:'#fff', fontWeight:700, border:'1px solid #b91c1c', padding:'8px 16px', borderRadius:8, fontSize:13, cursor:'pointer', boxShadow:'0 2px 6px rgba(220,38,38,0.35)' }}
                                disabled={modalSaving}
                              >Confirm Decline</button>
                            </div>
                          </div>
                        </div>
                      )}
                      <div className={styles.statusFlow}>
                        {stages.map((s, idx) => {
                          const done = completedIndex > idx;
                          const active = labelToKey(s.label) === currentKey;
                          const disabled = !active && !canTransition(s, idx);
                          return (
                            <React.Fragment key={s.key}>
                              <div
                                className={[
                                  styles.flowStep,
                                  done ? styles.done : '',
                                  active ? styles.active : '',
                                  disabled ? styles.disabled : ''
                                ].filter(Boolean).join(' ')}
                                onClick={() => handleTransition(s, idx)}
                                title={disabled ? 'Not available' : (active ? 'Current status' : 'Advance to ' + s.label)}
                              >
                                {active ? <span className={styles.pulseDot} /> : done ? '✓' : idx + 1}
                                <span>{s.label}</span>
                                {s.requiresProof && !proofProvided && s.label === 'Successful' && <span className={styles.sub}>Needs Proof</span>}
                              </div>
                              {idx < stages.length - 1 && (
                                <div className={[
                                  styles.flowConnector,
                                  (completedIndex >= idx) ? styles.done : '',
                                  active ? styles.active : ''
                                ].filter(Boolean).join(' ')} />
                              )}
                            </React.Fragment>
                          );
                        })}
                      </div>
                      <div className={styles.flowNote}>
                        Forward-only. Email is sent before advancing when required; Successful requires proof.
                      </div>
                    </div>
                  );
                })()}
              </div>
              <button
                className={`${styles.btn} ${styles.btnDelete}`}
                onClick={() => onDelete(selected.id)}
                style={{ padding: '8px 14px', fontSize: '13px', marginLeft: 'auto' }}
              >Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts rendered globally via ToastProvider */}
    </div>
  );
}

