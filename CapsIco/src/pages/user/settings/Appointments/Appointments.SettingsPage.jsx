import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './Appointments.SettingsPage.module.css';
import { onAuthStateChanged } from 'firebase/auth';
import authService from '/src/services/AuthService';
import { useToast } from '/src/components/shared/toast/ToastProvider.jsx';
import appointmentsService from '/src/services/AppointmentsService';
import ScheduleCalendar from '/src/components/user/bookAppointment/ScheduleCalendar';
import singleServicesService from '/src/services/SingleServicesService';
import servicePackagesService from '/src/services/ServicePackagesService';

export function AppointmentsSettingsPage() {
  const { show } = useToast?.() || { show: () => {} };
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All'); // All | Completed | Cancelled | Approved | Pending
  const [sort, setSort] = useState('newest'); // newest | oldest
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState({});
  const [user, setUser] = useState(null);
  const [feedbackOpen, setFeedbackOpen] = useState({});
  const [feedbackDraft, setFeedbackDraft] = useState({});
  const [submittingId, setSubmittingId] = useState('');
  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 9;

  const [cancelId, setCancelId] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [policy, setPolicy] = useState({ cancelCountCycle: 0, cooldownUntil: '' });

  // Reschedule state
  const [resRow, setResRow] = useState(null);
  const [resScheduleOpen, setResScheduleOpen] = useState(false);
  const [resDate, setResDate] = useState('');
  const [resTime, setResTime] = useState('');
  const [resActiveItem, setResActiveItem] = useState(null); // { availability, capacity }
  const [resConfirmOpen, setResConfirmOpen] = useState(false);
  const [resSubmitting, setResSubmitting] = useState(false);
  const [resReason, setResReason] = useState('');
  // Cooldown enforcement and early consideration
  const [penaltyOpen, setPenaltyOpen] = useState(false);
  const [penaltyReason, setPenaltyReason] = useState('');
  const [penaltyAction, setPenaltyAction] = useState(''); // 'cancel' | 'reschedule'

  const formatDate = (isoDate) => {
    if (!isoDate) return '';
    try {
      const d = new Date(`${isoDate}T00:00:00`);
      return d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
    } catch { return isoDate; }
  };

  const formatTime = (hhmm) => {
    if (!hhmm) return '';
    const [h, m] = String(hhmm).split(':').map((n) => parseInt(n, 10));
    if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
  };

  const statusVisual = (s) => {
    const t = String(s || '').toLowerCase();
    if (t.startsWith('complete')) return { label: 'Completed', tone: 'Green', icon: '✓' };
    if (t.startsWith('approv')) return { label: 'Approved', tone: 'Blue', icon: '→' };
    if (t.startsWith('pend')) return { label: 'Pending', tone: 'Yellow', icon: '⏳' };
    if (t.startsWith('cancel')) return { label: 'Cancelled', tone: 'Red', icon: '✕' };
    if (t.startsWith('decline')) return { label: 'Declined', tone: 'Red', icon: '✕' };
    return { label: s || 'Pending', tone: 'Yellow', icon: '⏳' };
  };

  useEffect(() => {
    let mounted = true;

    async function loadForUser(user) {
      try {
        setLoading(true);
        setError('');
        if (!user) {
          setItems([]);
          return;
        }
        let appts = [];
        try {
          appts = await appointmentsService.listByUser(user.uid);
        } catch {
          appts = [];
        }
        if (!appts || appts.length === 0) {
          const all = await appointmentsService.list();
          const userEmail = String(user.email || '').trim().toLowerCase();
          appts = all.filter((r) => {
            const uidMatch = String(r.USER_ID || '') === String(user.uid);
            const email = String(r.EMAIL || '').trim().toLowerCase();
            const emailMatch = !!userEmail && email === userEmail;
            return uidMatch || emailMatch;
          });
        }
        const [singleList, packageList] = await Promise.all([
          singleServicesService.list().catch(() => []),
          servicePackagesService.list().catch(() => []),
        ]);
        const singleById = new Map(singleList.map((s) => [String(s.SERVICE_ID || s.id || ''), s]));
        const pkgById = new Map(packageList.map((p) => [String(p.SERVICE_PACKGE_ID || p.id || ''), p]));

  const rows = appts.map((r) => {
          const serviceType = String(r.SERVICE_TYPE || '').toLowerCase();
          const isPackage = serviceType.includes('package');
          const serviceId = r.SERVICE_ID || '';
          const meta = isPackage ? pkgById.get(String(serviceId)) : singleById.get(String(serviceId));
          const name = meta?.NAME || meta?.name || (isPackage ? 'Service Package' : 'Single Service');
          const price =
            meta?.DISCOUNTED_PRICE ??
            meta?.ORIGINAL_PRICE ??
            meta?.PHIL_HEALTH_PROMO_PRICE ??
            meta?.PRICE_NOTE ??
            meta?.priceNote ?? 'Varies';
          const priceLabel = typeof price === 'number' ? `PHP ${price}` : String(price);

          const rawStatus = String(r.BOOKING_STATUS || 'pending').toLowerCase();
          const displayStatus = rawStatus === 'successful'
            ? 'Completed'
            : rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();

          const date = r.DATE_OF_APPOINTMENT || '';
          const time = r.TIME_SLOT || '';
          const note = r.SPECIAL_INSTRUCTIONS || r.CHIEF_COMPLAINT || '';
          const refId = r.APPT_ID || r.id;
          const fullName = [r.FIRST_NAME, r.LAST_NAME].filter(Boolean).join(' ');
          const capacity = Number(meta?.SLOT ?? 1) || 1;
          const availability = meta?.AVAILABILITY || '';

          return {
            id: refId,
            service: name,
            price: priceLabel,
            date,
            time,
            displayDate: formatDate(date),
            displayTime: formatTime(time),
            status: displayStatus,
            note,
            userName: fullName,
            email: r.EMAIL || '',
            phone: r.PHONE || '',
            serviceType: isPackage ? 'Package' : 'Service',
            serviceId: String(serviceId),
            availability,
            capacity,
            birthday: r.BIRTHDAY || '',
            gender: r.GENDER || '',
            complaint: r.CHIEF_COMPLAINT || '',
            instructions: r.SPECIAL_INSTRUCTIONS || '',
            createdAt: r.CREATED_AT || '',
            updatedAt: r.UPDATED_AT || '',
            slotCapacityRef: r.SLOT_CAPACITY_REF || '',
            proofUrl: r.PROOF || r.proof || '',
            feedback: r.FEEDBACK || null,
            cancelInfo: r.CANCELLATION || r.CANCEL_INFO || (r.CANCEL_REASON ? { reason: r.CANCEL_REASON } : null),
            rescheduleInfo: r.RESCHEDULE_INFO || null,
          };
        });

        if (mounted) setItems(rows);
      } catch (e) {
        console.error('Failed to load appointments', e);
        if (mounted) setError('Failed to load appointments.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    const unsub = onAuthStateChanged(authService.auth, (user) => {
      setUser(user || null);
      loadForUser(user);
      (async () => {
        if (user?.uid) {
          const p = await appointmentsService.getUserPolicy(user.uid);
          setPolicy(p || { cancelCountCycle: 0, cooldownUntil: '' });
        } else {
          setPolicy({ cancelCountCycle: 0, cooldownUntil: '' });
        }
      })();
    });
    if (authService.currentUser) {
      setUser(authService.currentUser);
      loadForUser(authService.currentUser);
    }

    return () => {
      mounted = false;
      unsub?.();
    };
  }, []);

  const filtered = useMemo(() => {
    let data = items;
    if (status !== 'All') data = data.filter((i) => (i.status || '').toLowerCase() === status.toLowerCase());
    if (query.trim()) {
      const q = query.toLowerCase();
      data = data.filter((i) =>
        (i.service || '').toLowerCase().includes(q) ||
        (i.id || '').toLowerCase().includes(q) ||
        (i.userName || '').toLowerCase().includes(q) ||
        (i.email || '').toLowerCase().includes(q) ||
        (i.phone || '').toLowerCase().includes(q) ||
        (i.status || '').toLowerCase().includes(q)
      );
    }
    // Sort by date + time if available, otherwise fallback to createdAt
    const parseDT = (row) => {
      const dtStr = row.date ? `${row.date}${row.time ? 'T'+row.time : ''}` : row.createdAt || '';
      const t = Date.parse(dtStr);
      return Number.isNaN(t) ? 0 : t;
    };
    const sorted = [...data].sort((a, b) => {
      const ta = parseDT(a);
      const tb = parseDT(b);
      return sort === 'oldest' ? ta - tb : tb - ta;
    });
    return sorted;
  }, [items, status, query, sort]);

  // Reset to first page when filters/search change
  useEffect(() => {
    setPage(1);
  }, [status, query, sort, items]);

  const totalPages = Math.max(1, Math.ceil((filtered || []).length / pageSize));
  const paged = useMemo(() => {
    const start = (page - 1) * pageSize;
    return (filtered || []).slice(start, start + pageSize);
  }, [filtered, page]);

  const setDraftRating = (id, key, value) => {
    setFeedbackDraft((prev) => {
      const curr = prev[id] || { message: '', ratings: {} };
      return { ...prev, [id]: { ...curr, ratings: { ...curr.ratings, [key]: value } } };
    });
  };

  const setDraftMessage = (id, message) => {
    setFeedbackDraft((prev) => {
      const curr = prev[id] || { message: '', ratings: {} };
      return { ...prev, [id]: { ...curr, message } };
    });
  };

  const submitFeedback = async (row) => {
    try {
      setSubmittingId(row.id);
      const draft = feedbackDraft[row.id] || { message: '', ratings: {} };
      const payload = {
        message: draft.message || '',
        ratings: {
          bookingEase: draft.ratings?.bookingEase,
          speed: draft.ratings?.speed,
          staff: draft.ratings?.staff,
          cleanliness: draft.ratings?.cleanliness,
          overall: draft.ratings?.overall,
        },
      };
      const saved = await appointmentsService.addFeedback(row.id, payload, user?.uid || '');
      setItems((prev) => prev.map((it) => (it.id === row.id ? { ...it, feedback: saved } : it)));
      setFeedbackOpen((m) => ({ ...m, [row.id]: false }));
      try { show({ type: 'success', title: 'Thank you!', message: 'Your feedback has been submitted successfully.' }); } catch (_) {}
    } catch (e) {
      console.error(e);
      alert(e?.message || 'Unable to submit feedback.');
    } finally {
      setSubmittingId('');
    }
  };

  const requestCancel = (row) => {
    // Block when under cooldown
    const cdActive = policy.cooldownUntil && Date.parse(policy.cooldownUntil) > Date.now();
    const chancesLeft = Math.max(0, 3 - (Number(policy.cancelCountCycle || 0) || 0));
    if (cdActive || chancesLeft <= 0) {
      setPenaltyAction('cancel');
      setPenaltyReason('');
      setPenaltyOpen(true);
      return;
    }
    setCancelId(row.id);
    setCancelReason('');
  };

  const confirmCancel = async () => {
    if (!cancelId) return;
    try {
      setCancelSubmitting(true);
      const at = new Date().toISOString();
      const res = await appointmentsService.cancel(cancelId, cancelReason, user?.uid || '');
      setItems((prev) => prev.map((it) => it.id === cancelId ? { ...it, status: 'Cancelled', cancelInfo: { reason: cancelReason, at, by: user?.uid || '' } } : it));
      // Update policy UI immediately
      if (res && (typeof res.remaining === 'number' || res.cooldownUntil)) {
        const used = Math.min(3, 3 - (res.remaining ?? Math.max(0, 3 - (policy.cancelCountCycle || 0))));
        const remain = typeof res.remaining === 'number' ? res.remaining : Math.max(0, 3 - ((policy.cancelCountCycle || 0) + 1));
        setPolicy({ cancelCountCycle: 3 - remain, cooldownUntil: res.cooldownUntil || '' });
        const msg = res.cooldownUntil ? 'You reached the limit. You cannot book for 3 days.' : `${remain} chance${remain === 1 ? '' : 's'} left to cancel or reschedule.`;
        try { show({ type: res.cooldownUntil ? 'warning' : 'info', title: 'Cancellation updated', message: msg }); } catch (_) {}
      }
      setCancelId('');
      setCancelReason('');
      try { show({ type: 'success', title: 'Appointment cancelled', message: 'Your appointment was successfully cancelled.' }); } catch (_) {}
    } catch (e) {
      console.error(e);
      alert(e?.message || 'Unable to cancel appointment.');
    } finally {
      setCancelSubmitting(false);
    }
  };

  const StarBar = ({ value = 0, onChange }) => (
    <div className={styles.starsRow}>
      {[1,2,3,4,5].map((n) => (
        <button
          key={n}
          type="button"
          className={`${styles.star} ${n <= value ? styles.starFilled : ''}`}
          aria-label={`${n} star${n>1?'s':''}`}
          onClick={(e) => { e.stopPropagation(); onChange && onChange(n); }}
        >★</button>
      ))}
    </div>
  );

  const canCancel = (row) => {
    const s = String(row.status || '').toLowerCase();
    return s === 'pending' || s === 'approved';
  };

  const canReschedule = (row) => {
    const s = String(row.status || '').toLowerCase();
    return s === 'pending' || s === 'approved';
  };

  const requestReschedule = (row) => {
    // Block when under cooldown
    const cdActive = policy.cooldownUntil && Date.parse(policy.cooldownUntil) > Date.now();
    const chancesLeft = Math.max(0, 3 - (Number(policy.cancelCountCycle || 0) || 0));
    if (cdActive || chancesLeft <= 0) {
      setPenaltyAction('reschedule');
      setPenaltyReason('');
      setPenaltyOpen(true);
      return;
    }
    // Build minimal activeItem shape for ScheduleCalendar
    const active = {
      availability: row.availability || '',
      capacity: Number(row.capacity ?? 1) || 1,
    };
    setResActiveItem(active);
    setResRow(row);
    setResDate(row.date || '');
    setResTime(row.time || '');
    setResScheduleOpen(true);
  };

  const confirmReschedule = async () => {
    if (!resRow || !resDate || !resTime) { setResConfirmOpen(false); return; }
    try {
      setResSubmitting(true);
      const payload = {
        serviceId: resRow.serviceId,
        oldDate: resRow.date,
        oldTime: resRow.time,
        newDate: resDate,
        newTime: resTime,
        capacity: Number(resRow.capacity ?? 1) || 1,
        reason: resReason || '',
      };
      const res = await appointmentsService.reschedule(resRow.id, payload, user?.uid || '');
      // Update table row
      const isApproved = String(resRow.status || '').toLowerCase().startsWith('approv');
      setItems((prev) => prev.map((it) => it.id === resRow.id ? {
        ...it,
        date: resDate,
        time: resTime,
        displayDate: formatDate(resDate),
        displayTime: formatTime(resTime),
        status: isApproved ? 'Rescheduled' : 'Pending',
        rescheduleInfo: { ...(it.rescheduleInfo || {}), reason: resReason || '', at: new Date().toISOString(), by: user?.uid || '' },
      } : it));
      // Update policy UI
      if (isApproved && res && (typeof res.remaining === 'number' || res.cooldownUntil)) {
        const remain = typeof res.remaining === 'number' ? res.remaining : Math.max(0, 3 - ((policy.cancelCountCycle || 0) + 1));
        setPolicy({ cancelCountCycle: 3 - remain, cooldownUntil: res.cooldownUntil || '' });
        const msg = res.cooldownUntil ? 'You reached the limit. You cannot book for 3 days.' : `${remain} chance${remain === 1 ? '' : 's'} left to cancel or reschedule.`;
        try { show({ type: res.cooldownUntil ? 'warning' : 'info', title: 'Policy updated', message: msg }); } catch (_) {}
      }
      try { show({ type: 'success', title: 'Rescheduled', message: isApproved ? 'Your appointment has been rescheduled. One chance was deducted.' : 'Your appointment has been rescheduled. No chances deducted for pending appointments.' }); } catch (_) {}
  setResConfirmOpen(false);
  setResScheduleOpen(false);
      setResRow(null);
      setResReason('');
    } catch (e) {
      console.error(e);
      alert(e?.message || 'Unable to reschedule. The selected slot may be full.');
    } finally {
      setResSubmitting(false);
    }
  };

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <h2>Appointments</h2>
        <div className={styles.filters}>
          <input
            className={styles.search}
            type="text"
            placeholder="Search by service, patient or ref#..."
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
          <select className={styles.select} value={sort} onChange={(e) => setSort(e.target.value)} title="Sort by date">
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
          <div className={styles.policy} title="Three cancellations or reschedules lead to a 3-day cooldown.">
            {(() => {
              const cdActive = policy.cooldownUntil && Date.parse(policy.cooldownUntil) > Date.now();
              const remaining = Math.max(0, 3 - (policy.cancelCountCycle || 0));
              return (
                <>
                  <span className={styles.policyChances}>{cdActive ? '0' : String(remaining)} chances left</span>
                  <span className={styles.policyNote}>• 3 cancellations or reschedules will lock appointments for 3 days</span>
                </>
              );
            })()}
          </div>
        </div>
      </div>
      {error && !loading && (
        <div className={styles.error}>{error}</div>
      )}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Patient</th>
              <th>Service</th>
              <th>Date</th>
              <th>Time</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={`sk-${i}`}>
                  <td colSpan="6">
                    <div className={styles.skeletonRow}></div>
                  </td>
                </tr>
              ))
            ) : !loading && filtered.length === 0 ? (
              <tr>
                <td className={styles.empty} colSpan="6">No records found.</td>
              </tr>
            ) : (
              paged.map((row) => (
                <React.Fragment key={row.id}>
                  <tr
                    className={styles.clickRow}
                    aria-expanded={expanded[row.id] ? 'true' : 'false'}
                    onClick={() => setExpanded((m) => ({ ...m, [row.id]: !m[row.id] }))}
                  >
                    <td>
                      <div className={styles.patientCell}>
                        <button
                          type="button"
                          className={styles.toggleBtn}
                          aria-label={expanded[row.id] ? 'Hide details' : 'Show details'}
                          onClick={(e) => { e.stopPropagation(); setExpanded((m) => ({ ...m, [row.id]: !m[row.id] })); }}
                        >
                          <span className={`${styles.caret} ${expanded[row.id] ? styles.caretOpen : ''}`}></span>
                        </button>
                        <div>
                          <div className={styles.mainCell}>{row.userName || '—'}</div>
                          <div className={styles.subCell}>
                            {[row.email, row.phone].filter(Boolean).join(' • ') || '—'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className={styles.serviceCell}>
                      <div className={styles.mainCell}>{row.service}</div>
                      {row.note && <div className={styles.subCell}>{row.note}</div>}
                    </td>
                    <td className={styles.dateCell}>{row.displayDate || row.date}</td>
                    <td className={styles.timeCell}>{row.displayTime || row.time}</td>
                    <td className={styles.statusCell}>
                      {(() => {
                        const v = statusVisual(row.status);
                        const toneClass = styles[`badge${v.tone}`] || styles.badgeYellow;
                        return (
                          <span className={`${styles.badge} ${toneClass}`}>
                            <span className={styles.badgeIcon} aria-hidden="true">{v.icon}</span>
                            {v.label}
                          </span>
                        );
                      })()}
                    </td>
                    <td className={styles.actionsCell}>
                      {canCancel(row) ? (
                        <>
                          <button type="button" className={styles.btnGhost} onClick={(e) => { e.stopPropagation(); requestReschedule(row); }}>Reschedule</button>
                          <button type="button" className={styles.btnDanger} onClick={(e) => { e.stopPropagation(); requestCancel(row); }}>Cancel</button>
                        </>
                      ) : (
                        <span className={styles.subCell}>—</span>
                      )}
                    </td>
                  </tr>
                  {expanded[row.id] && (
                    <tr className={styles.detailsRow}>
                      <td colSpan="6">
                        <div className={styles.details}>
                          <div className={styles.detailsCol}>
                            <div className={styles.detailItem}><span className={styles.label}>Service Type</span><span className={styles.value}>{row.serviceType}</span></div>
                            <div className={styles.detailItem}><span className={styles.label}>Service ID</span><span className={styles.value}>{row.serviceId || '—'}</span></div>
                            <div className={styles.detailItem}><span className={styles.label}>Appointment Date</span><span className={styles.value}>{row.date || '—'}</span></div>
                            <div className={styles.detailItem}><span className={styles.label}>Time</span><span className={styles.value}>{row.time || '—'}</span></div>
                            <div className={styles.detailItem}><span className={styles.label}>Status</span><span className={styles.value}>{row.status}</span></div>
                            {(() => {
                              const priceStr = String(row.price || '');
                              const isNumericPrice = priceStr.startsWith('PHP') && /\d/.test(priceStr);
                              if (isNumericPrice) {
                                return <div className={styles.detailItem}><span className={styles.label}>Price</span><span className={styles.value}>{row.price}</span></div>;
                              }
                              return null;
                            })()}
                          </div>
                          <div className={styles.detailsCol}>
                            <div className={styles.detailItem}><span className={styles.label}>Patient</span><span className={styles.value}>{row.userName || '—'}</span></div>
                            <div className={styles.detailItem}><span className={styles.label}>Email</span><span className={styles.value}>{row.email || '—'}</span></div>
                            <div className={styles.detailItem}><span className={styles.label}>Phone</span><span className={styles.value}>{row.phone || '—'}</span></div>
                            <div className={styles.detailItem}><span className={styles.label}>Gender</span><span className={styles.value}>{row.gender || '—'}</span></div>
                            <div className={styles.detailItem}><span className={styles.label}>Birthday</span><span className={styles.value}>{row.birthday || '—'}</span></div>
                          </div>
                        </div>
                        {(row.complaint || row.instructions) && (
                          <div className={styles.notesBlock}>
                            {row.complaint && (
                              <div className={styles.noteLine}><span className={styles.label}>Chief Complaint</span><span className={styles.value}>{row.complaint}</span></div>
                            )}
                            {row.instructions && (
                              <div className={styles.noteLine}><span className={styles.label}>Special Instructions</span><span className={styles.value}>{row.instructions}</span></div>
                            )}
                          </div>
                        )}
                        <div className={styles.notesBlock}>
                          <div className={styles.noteLine}>
                            <span className={styles.label}>Feedback</span>
                            <span className={styles.value}>
                              {row.feedback ? (
                                <div className={styles.feedbackView}>
                                  <div className={styles.feedbackRatings}>
                                    <div className={styles.ratingLine}><span>Easy Booking</span><StarBar value={row.feedback.ratings?.bookingEase || 0} /></div>
                                    <div className={styles.ratingLine}><span>Fast Transaction</span><StarBar value={row.feedback.ratings?.speed || 0} /></div>
                                    <div className={styles.ratingLine}><span>Great Staff</span><StarBar value={row.feedback.ratings?.staff || 0} /></div>
                                    <div className={styles.ratingLine}><span>Clean Facility</span><StarBar value={row.feedback.ratings?.cleanliness || 0} /></div>
                                    <div className={styles.ratingLine}><span>Overall Experience</span><StarBar value={row.feedback.ratings?.overall || 0} /></div>
                                  </div>
                                  {row.feedback.message && (
                                    <div className={styles.feedbackMessage}>“{row.feedback.message}”</div>
                                  )}
                                </div>
                              ) : (row.status === 'Completed' ? (
                                feedbackOpen[row.id] ? (
                                  <div className={styles.feedbackForm}>
                                    <div className={styles.ratingLine}><span>Easy Booking</span><StarBar value={feedbackDraft[row.id]?.ratings?.bookingEase || 0} onChange={(n) => setDraftRating(row.id, 'bookingEase', n)} /></div>
                                    <div className={styles.ratingLine}><span>Fast Transaction</span><StarBar value={feedbackDraft[row.id]?.ratings?.speed || 0} onChange={(n) => setDraftRating(row.id, 'speed', n)} /></div>
                                    <div className={styles.ratingLine}><span>Great Staff</span><StarBar value={feedbackDraft[row.id]?.ratings?.staff || 0} onChange={(n) => setDraftRating(row.id, 'staff', n)} /></div>
                                    <div className={styles.ratingLine}><span>Clean Facility</span><StarBar value={feedbackDraft[row.id]?.ratings?.cleanliness || 0} onChange={(n) => setDraftRating(row.id, 'cleanliness', n)} /></div>
                                    <div className={styles.ratingLine}><span>Overall Experience</span><StarBar value={feedbackDraft[row.id]?.ratings?.overall || 0} onChange={(n) => setDraftRating(row.id, 'overall', n)} /></div>
                                    <textarea
                                      className={styles.feedbackTextarea}
                                      placeholder="Share more about your experience (optional)"
                                      value={feedbackDraft[row.id]?.message || ''}
                                      onChange={(e) => setDraftMessage(row.id, e.target.value)}
                                      maxLength={2000}
                                    />
                                    <div className={styles.feedbackActions}>
                                      {(() => {
                                        const d = feedbackDraft[row.id] || { ratings: {} };
                                        const any = [d.ratings?.bookingEase, d.ratings?.speed, d.ratings?.staff, d.ratings?.cleanliness, d.ratings?.overall].some((v) => Number(v) > 0);
                                        return (
                                          <button type="button" className={styles.btnPrimary} disabled={submittingId === row.id || !any} onClick={() => submitFeedback(row)} title={!any ? 'Select at least one rating' : undefined}>
                                            {submittingId === row.id ? 'Submitting…' : 'Submit Feedback'}
                                          </button>
                                        );
                                      })()}
                                      <button type="button" className={styles.btnGhost} onClick={() => setFeedbackOpen((m) => ({ ...m, [row.id]: false }))}>Cancel</button>
                                    </div>
                                  </div>
                                ) : (
                                  <button type="button" className={styles.btnPrimary} onClick={(e) => { e.stopPropagation(); setFeedbackOpen((m) => ({ ...m, [row.id]: true })); }}>Add Feedback</button>
                                )
                              ) : (
                                <span className={styles.subCell}>Available after completion</span>
                              ))}
                            </span>
                          </div>
                        </div>
                        {row.status === 'Cancelled' && row.cancelInfo && (
                          <div className={styles.notesBlock}>
                            <div className={styles.noteLine}><span className={styles.label}>Cancellation</span><span className={styles.value}>{row.cancelInfo.reason ? `Reason: ${row.cancelInfo.reason}` : 'No reason provided'}{row.cancelInfo.at ? ` • at ${row.cancelInfo.at}` : ''}</span></div>
                          </div>
                        )}
                        {canCancel(row) && (
                          <div className={styles.metaBlock}>
                            <div className={styles.metaItem}>
                              <button type="button" className={styles.btnGhost} onClick={(e) => { e.stopPropagation(); requestReschedule(row); }}>Reschedule</button>
                            </div>
                            <div className={styles.metaItem}>
                              <button type="button" className={styles.btnDanger} onClick={(e) => { e.stopPropagation(); requestCancel(row); }}>Cancel Appointment</button>
                            </div>
                          </div>
                        )}
                        {(row.createdAt || row.updatedAt || row.slotCapacityRef) && (
                          <div className={styles.metaBlock}>
                            {row.createdAt && <div className={styles.metaItem}>Created: <span className={styles.mono}>{row.createdAt}</span></div>}
                            {row.updatedAt && <div className={styles.metaItem}>Updated: <span className={styles.mono}>{row.updatedAt}</span></div>}
                            {row.slotCapacityRef && <div className={styles.metaItem}>Slot Ref: <span className={styles.mono}>{row.slotCapacityRef}</span></div>}
                          </div>
                        )}
                        {row.status === 'Completed' && row.proofUrl && (
                          <div className={styles.notesBlock}>
                            <div className={styles.noteLine}>
                              <span className={styles.label}>Proof of Completion</span>
                              <span className={styles.value}>
                                <a href={row.proofUrl} target="_blank" rel="noreferrer" style={{ marginRight: 12 }}>Open</a>
                                <img
                                  src={row.proofUrl}
                                  alt="Appointment proof"
                                  style={{ maxHeight: 100, borderRadius: 6, border: '1px solid #ddd' }}
                                />
                              </span>
                            </div>
                          </div>
                        )}
                        {row.rescheduleInfo && (
                          <div className={styles.notesBlock}>
                            <div className={styles.noteLine}>
                              <span className={styles.label}>Reschedule</span>
                              <span className={styles.value}>
                                {row.rescheduleInfo.reason ? `Reason: ${row.rescheduleInfo.reason}` : 'No reason provided'}
                                {row.rescheduleInfo.at ? ` • at ${row.rescheduleInfo.at}` : ''}
                              </span>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      <div className={styles.pagination} aria-label="Appointments pagination">
        <button type="button" className={styles.pageBtn} onClick={() => setPage((p) => Math.max(1, p-1))} disabled={page === 1}>Prev</button>
        {Array.from({ length: totalPages }).map((_, i) => {
          const p = i+1;
          return (
            <button
              key={`pg-${p}`}
              type="button"
              className={`${styles.pageBtn} ${p === page ? styles.pageBtnActive : ''}`}
              onClick={() => setPage(p)}
            >{p}</button>
          );
        })}
        <button type="button" className={styles.pageBtn} onClick={() => setPage((p) => Math.min(totalPages, p+1))} disabled={page === totalPages}>Next</button>
      </div>

      {cancelId && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="cancelTitle">
            <h3 id="cancelTitle">Cancel appointment?</h3>
            <p>Please confirm you want to cancel this appointment. Optionally, share a reason:</p>
            <textarea
              className={styles.cancelTextarea}
              placeholder="Reason for cancellation (optional)"
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              maxLength={1000}
            />
            <div className={styles.modalActions}>
              <button type="button" className={styles.btnGhost} onClick={() => setCancelId('')} disabled={cancelSubmitting}>Back</button>
              <button type="button" className={styles.btnDanger} onClick={confirmCancel} disabled={cancelSubmitting}>
                {cancelSubmitting ? 'Cancelling…' : 'Confirm Cancel'}
              </button>
            </div>
          </div>
        </div>
      )}

      {resScheduleOpen && resRow && (
        <ScheduleCalendar
          open={resScheduleOpen}
          onClose={() => setResScheduleOpen(false)}
          onConfirm={() => setResConfirmOpen(true)}
          activeItem={resActiveItem}
          serviceKey={resRow.serviceId}
          date={resDate}
          setDate={setResDate}
          time={resTime}
          setTime={setResTime}
        />
      )}

      {resConfirmOpen && resRow && (() => {
        const node = (
          <div className={`${styles.modalOverlay} ${styles.modalOverlayFront}`}>
            <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="resTitle">
              <h3 id="resTitle">Confirm reschedule?</h3>
              {String(resRow.status || '').toLowerCase().startsWith('approv') ? (
                <p>
                  Rescheduling an approved appointment will deduct one chance from your policy. You currently have{' '}
                  {Math.max(0, 3 - (policy.cancelCountCycle || 0))}
                  {' '}chance{Math.max(0, 3 - (policy.cancelCountCycle || 0)) === 1 ? '' : 's'} left.
                </p>
              ) : (
                <p>
                  This appointment is still pending. Rescheduling pending appointments does not deduct chances. The status will remain Pending until approved.
                </p>
              )}
              <p>
                New schedule: <strong>{resDate}</strong> at <strong>{resTime}</strong>
              </p>
              <div className={styles.modalBody}>
                <label className={styles.label} htmlFor="resReason">Reason (optional)</label>
                <textarea
                  id="resReason"
                  className={styles.cancelTextarea}
                  placeholder="Reason for rescheduling (optional)"
                  value={resReason}
                  onChange={(e) => setResReason(e.target.value)}
                  maxLength={1000}
                />
              </div>
              <div className={styles.modalActions}>
                <button type="button" className={styles.btnGhost} onClick={() => setResConfirmOpen(false)} disabled={resSubmitting}>Cancel</button>
                <button type="button" className={styles.btnPrimary} onClick={confirmReschedule} disabled={resSubmitting}>
                  {resSubmitting ? 'Rescheduling…' : 'Confirm Reschedule'}
                </button>
              </div>
            </div>
          </div>
        );
        try { return createPortal(node, document.body); } catch { return node; }
      })()}

      {penaltyOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="penTitle">
            <h3 id="penTitle">Action temporarily locked</h3>
            <p>
              You have reached the limit for cancellations/reschedules. This action is locked for 3 days.
              If you have an urgent or valid reason, you can submit it below for admin consideration.
            </p>
            {policy.cooldownUntil && (
              <p className={styles.subCell} style={{ marginTop: 4 }}>Cooldown ends: <strong>{policy.cooldownUntil}</strong></p>
            )}
            <label className={styles.label} htmlFor="penalReason">Reason (optional)</label>
            <textarea
              id="penalReason"
              className={styles.cancelTextarea}
              placeholder="Describe briefly why you need this sooner (optional)"
              value={penaltyReason}
              onChange={(e) => setPenaltyReason(e.target.value)}
              maxLength={1000}
            />
            <div className={styles.modalActions}>
              <button type="button" className={styles.btnGhost} onClick={() => setPenaltyOpen(false)}>Close</button>
              <button
                type="button"
                className={styles.btnPrimary}
                onClick={async () => {
                  try {
                    if (!user?.uid) { setPenaltyOpen(false); alert('Please login again.'); return; }
                    await appointmentsService.submitPolicyOverrideRequest(user.uid, {
                      action: penaltyAction || 'cancel',
                      reason: penaltyReason,
                    });
                    setPenaltyOpen(false);
                    try { show({ type: 'success', title: 'Request sent', message: 'Your request was submitted for review.' }); } catch (_) {}
                  } catch (e) {
                    alert(e?.message || 'Unable to submit request now.');
                  }
                }}
              >
                Send for consideration
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
