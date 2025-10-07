import React, { useEffect, useMemo, useState } from 'react';
import styles from './History.SettingsPage.module.css';
import { onAuthStateChanged } from 'firebase/auth';
import authService from '/src/services/AuthService';
import appointmentsService from '/src/services/AppointmentsService';
import singleServicesService from '/src/services/SingleServicesService';
import servicePackagesService from '/src/services/ServicePackagesService';

export function HistorySettingsPage() {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('All'); // All | Completed | Cancelled | Approved | Pending
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expanded, setExpanded] = useState({});
  const [user, setUser] = useState(null);
  const [feedbackOpen, setFeedbackOpen] = useState({});
  const [feedbackDraft, setFeedbackDraft] = useState({});
  const [submittingId, setSubmittingId] = useState('');

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
    if (t.startsWith('decline') || t.startsWith('cancel')) return { label: 'Declined', tone: 'Red', icon: '✕' };
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
        // Fallback: if none found by USER_ID, match by email (handles legacy records)
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
          // Map 'successful' to 'Completed' for user-side consistency
          const displayStatus = rawStatus === 'successful'
            ? 'Completed'
            : rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1).toLowerCase();

          const date = r.DATE_OF_APPOINTMENT || '';
          const time = r.TIME_SLOT || '';
          const note = r.SPECIAL_INSTRUCTIONS || r.CHIEF_COMPLAINT || '';
          const refId = r.APPT_ID || r.id;
          const fullName = [r.FIRST_NAME, r.LAST_NAME].filter(Boolean).join(' ');

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
            // extra details for dropdown
            serviceType: isPackage ? 'Package' : 'Service',
            serviceId: String(serviceId),
            birthday: r.BIRTHDAY || '',
            gender: r.GENDER || '',
            complaint: r.CHIEF_COMPLAINT || '',
            instructions: r.SPECIAL_INSTRUCTIONS || '',
            createdAt: r.CREATED_AT || '',
            updatedAt: r.UPDATED_AT || '',
            slotCapacityRef: r.SLOT_CAPACITY_REF || '',
            proofUrl: r.PROOF || r.proof || '',
            feedback: r.FEEDBACK || null,
          };
        });

        if (mounted) setItems(rows);
      } catch (e) {
        console.error('Failed to load appointment history', e);
        if (mounted) setError('Failed to load appointment history.');
      } finally {
        if (mounted) setLoading(false);
      }
    }

    const unsub = onAuthStateChanged(authService.auth, (user) => {
      setUser(user || null);
      loadForUser(user);
    });
    // In case auth is already ready
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
    return data;
  }, [items, status, query]);

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
    } catch (e) {
      console.error(e);
      alert(e?.message || 'Unable to submit feedback.');
    } finally {
      setSubmittingId('');
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
          onClick={() => onChange && onChange(n)}
        >★</button>
      ))}
    </div>
  );

  return (
    <section className={styles.card}>
      <div className={styles.header}>
        <h2>Appointment History</h2>
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
        </div>
      </div>
      {error && !loading && (
        <div className={styles.error}>{error}</div>
      )}
      <div className={styles.tableWrap}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Ref #</th>
              <th>Patient</th>
              <th>Service</th>
              <th>Price</th>
              <th>Date</th>
              <th>Time</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <tr key={`sk-${i}`}>
                  <td colSpan="7">
                    <div className={styles.skeletonRow}></div>
                  </td>
                </tr>
              ))
            ) : !loading && filtered.length === 0 ? (
              <tr>
                <td className={styles.empty} colSpan="7">No records found.</td>
              </tr>
            ) : (
              filtered.map((row) => (
                <React.Fragment key={row.id}>
                  <tr>
                    <td className={styles.refCell}>
                      <button
                        type="button"
                        className={styles.toggleBtn}
                        aria-label={expanded[row.id] ? 'Hide details' : 'Show details'}
                        onClick={() => setExpanded((m) => ({ ...m, [row.id]: !m[row.id] }))}
                      >
                        <span className={`${styles.caret} ${expanded[row.id] ? styles.caretOpen : ''}`}></span>
                      </button>
                      <span className={styles.mono}>{row.id}</span>
                    </td>
                    <td>
                      <div className={styles.mainCell}>{row.userName || '—'}</div>
                      <div className={styles.subCell}>
                        {[row.email, row.phone].filter(Boolean).join(' • ') || '—'}
                      </div>
                    </td>
                    <td className={styles.serviceCell}>
                      <div className={styles.mainCell}>{row.service}</div>
                      {row.note && <div className={styles.subCell}>{row.note}</div>}
                    </td>
                    <td className={styles.priceCell}>{row.price}</td>
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
                  </tr>
                  {expanded[row.id] && (
                    <tr className={styles.detailsRow}>
                      <td colSpan="7">
                        <div className={styles.details}>
                          <div className={styles.detailsCol}>
                            <div className={styles.detailItem}><span className={styles.label}>Service Type</span><span className={styles.value}>{row.serviceType}</span></div>
                            <div className={styles.detailItem}><span className={styles.label}>Service ID</span><span className={styles.value}>{row.serviceId || '—'}</span></div>
                            <div className={styles.detailItem}><span className={styles.label}>Appointment Date</span><span className={styles.value}>{row.date || '—'}</span></div>
                            <div className={styles.detailItem}><span className={styles.label}>Time</span><span className={styles.value}>{row.time || '—'}</span></div>
                            <div className={styles.detailItem}><span className={styles.label}>Status</span><span className={styles.value}>{row.status}</span></div>
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
                              ) : (row.status === 'Completed' && row.proofUrl ? (
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
                                  <button type="button" className={styles.btnPrimary} onClick={() => setFeedbackOpen((m) => ({ ...m, [row.id]: true }))}>Add Feedback</button>
                                )
                              ) : (
                                <span className={styles.subCell}>Available after completion</span>
                              ))}
                            </span>
                          </div>
                        </div>
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
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
