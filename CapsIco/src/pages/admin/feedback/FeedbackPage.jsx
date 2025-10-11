import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './FeedbackPage.module.css';
import appointmentsService from '/src/services/AppointmentsService';
import { useToast } from '/src/components/shared/toast/ToastProvider.jsx';
import { ref as dbRef, push as dbPush, update as dbUpdate } from 'firebase/database';
import activityLogService from '/src/services/ActivityLogService';
import { usersDB } from '/src/config/firebase-config';

function Stars({ value=0 }) {
  const v = Math.round(Number(value) || 0);
  return (
    <span className={styles.stars} aria-label={`Rating: ${v} out of 5`}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < v ? styles.starFilled : styles.starEmpty}>★</span>
      ))}
    </span>
  );
}

export function FeedbackPage() {
  const { show } = useToast?.() || { show: () => {} };
  const [query, setQuery] = useState('');
  // Status filter removed: feedback list only contains completed/successful appointments
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState('');
  const [sort, setSort] = useState('Newest'); // Newest | Oldest | Highest Rating
  const [loading, setLoading] = useState(true);
  // Auto-thank toggle and guards
  const [autoThank, setAutoThank] = useState(() => {
    try { return JSON.parse(localStorage.getItem('feedback.autoThank') || 'false'); } catch(_) { return false; }
  });
  const autoBusyRef = useRef(false);
  const lastSigRef = useRef('');

  useEffect(() => {
    let mounted = true;
    async function load() {
      setLoading(true);
      try {
        // Read all appointments, then collect those with FEEDBACK
        const appts = await appointmentsService.list();
        const rows = (appts || [])
          .filter((r) => r && r.FEEDBACK)
          .map((r) => {
            const f = r.FEEDBACK || {};
            const ratings = f.ratings || {};
            const vals = [ratings.overall, ratings.bookingEase, ratings.speed, ratings.staff, ratings.cleanliness]
              .map((n) => (typeof n === 'number' ? n : null))
              .filter((n) => n != null);
            const avg = vals.length ? Math.round((vals.reduce((a,b)=>a+b,0)/vals.length)*10)/10 : 0;
            return {
              id: r.APPT_ID || r.id,
              createdAt: f.createdAt || r.UPDATED_AT || r.CREATED_AT || '',
              status: r.BOOKING_STATUS || '',
              serviceName: r.SERVICE_NAME || '',
              serviceType: r.SERVICE_TYPE || '',
              date: r.DATE_OF_APPOINTMENT || '',
              time: r.TIME_SLOT || '',
              name: [r.FIRST_NAME, r.LAST_NAME].filter(Boolean).join(' '),
              email: r.EMAIL || '',
              phone: r.PHONE || '',
              message: f.message || '',
              ratings,
              avg,
              thanked: !!(f.THANKED || f.thanked),
              thankedAt: f.THANKED_AT || f.thankedAt || '',
            };
          });
        if (mounted) {
          setItems(rows);
          if (!selectedId && rows.length) setSelectedId(rows[0].id);
        }
      } finally { setLoading(false); }
    }
    load();
    return () => { mounted = false; };
  }, []);

  const filtered = useMemo(() => {
    let data = [...items];
    if (query.trim()) {
      const q = query.toLowerCase();
      data = data.filter((i) =>
        (i.name||'').toLowerCase().includes(q) ||
        (i.email||'').toLowerCase().includes(q) ||
        (i.serviceName||'').toLowerCase().includes(q) ||
        (i.message||'').toLowerCase().includes(q)
      );
    }
    if (sort === 'Newest') data.sort((a,b) => String(b.createdAt).localeCompare(String(a.createdAt)));
    if (sort === 'Oldest') data.sort((a,b) => String(a.createdAt).localeCompare(String(b.createdAt)));
    if (sort === 'Highest Rating') data.sort((a,b) => (b.avg||0)-(a.avg||0));
    return data;
  }, [items, query, sort]);

  const selected = useMemo(() => filtered.find((x) => x.id === selectedId) || filtered[0], [filtered, selectedId]);

  const buildThankYouEmail = (row) => {
    const name = row?.name || 'Customer';
    const svc = row?.serviceName || 'your appointment';
    const parts = [];
    parts.push(`Hi ${name},`);
    parts.push('');
    parts.push('Thank you for sharing your feedback. We truly appreciate your time—it helps us improve our services.');
    parts.push('');
    parts.push(`Service: ${svc}`);
    if (row?.date || row?.time) parts.push(`Date/Time: ${[row.date, row.time].filter(Boolean).join(' · ')}`);
    const r = row?.ratings || {};
    const lines = [
      ['Easy Booking', r.bookingEase],
      ['Fast Transaction', r.speed],
      ['Great Staff', r.staff],
      ['Clean Facility', r.cleanliness],
      ['Overall Experience', r.overall],
    ].filter((x) => typeof x[1] === 'number');
    if (lines.length) {
      parts.push('');
      parts.push('Your ratings:');
      for (const [label, val] of lines) parts.push(`• ${label}: ${val} / 5`);
    }
    if (row?.message) {
      parts.push('');
      parts.push('Your comment:');
      parts.push(`“${row.message}”`);
    }
    parts.push('');
    parts.push('Thank you again for helping us serve you better.');
    parts.push('Prime Medical Laboratory');
    return parts.join('\n');
  };

  // Helper to enqueue a thank-you email and mark flags
  const enqueueThankYou = async (row) => {
    const subject = 'Thank you for your feedback';
    const text = buildThankYouEmail(row);
    await dbPush(dbRef(usersDB, 'emailQueue'), { to: row.email, subject, text });
    const nowIso = new Date().toISOString();
    try { await dbUpdate(dbRef(usersDB, `appointments/${row.id}/FEEDBACK`), { THANKED: true, THANKED_AT: nowIso }); } catch(_) {}
    setItems(prev => prev.map(i => i.id === row.id ? { ...i, thanked: true, thankedAt: nowIso } : i));
  };

  const sendThankYou = async (row) => {
    if (!row || !row.email) {
      show({ type: 'error', title: 'No email available', message: 'This feedback has no email address to reply to.' });
      return;
    }
    const confirm = () => enqueueThankYou(row)
      .then(() => {
        show({ type: 'success', title: 'Email queued', message: 'A thank you email has been queued for sending.' });
      })
      .catch((e) => {
        show({ type: 'error', title: 'Failed to send', message: e?.message || 'Please try again later.' });
        throw e; // keep confirmation toast open on error
      });
    show({
      type: 'success',
      title: 'Send a Thank You Email?',
      message: `Send a thank you email to ${row.email}?`,
      duration: 0,
      actions: [
        { label: 'Cancel', kind: 'ghost', onClick: () => {} },
        { label: 'Send a Thank You Email', kind: 'confirm', onClick: confirm },
      ],
    });
  };

  return (
    <>
      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <div className={styles.filters}>
              <input className={styles.search} placeholder="Search name, email, service, or text…" value={query} onChange={(e)=> setQuery(e.target.value)} />
              <select className={styles.select} value={sort} onChange={(e)=> setSort(e.target.value)}>
                <option>Newest</option>
                <option>Oldest</option>
                <option>Highest Rating</option>
              </select>
            </div>
            <div className={styles.headerActions}>
              <button
                className={styles.btnGhost}
                onClick={() => {
                  const next = !autoThank;
                  setAutoThank(next);
                  try { localStorage.setItem('feedback.autoThank', JSON.stringify(next)); } catch(_) {}
                }}
                title="Automatically send thank you emails for new feedback"
              >
                {autoThank ? 'Auto Thank You — On' : 'Auto Thank You — Off'}
              </button>
            </div>
          </div>

          <div className={styles.cardBody}>
            <div className={styles.split}>
              <aside className={styles.listPane}>
                {loading ? (
                  <div className={styles.empty}>Loading…</div>
                ) : filtered.length === 0 ? (
                  <div className={styles.empty}>No feedback yet.</div>
                ) : (
                  <ul className={styles.list}>
                    {filtered.map((m) => (
                      <li key={m.id} className={`${styles.item} ${selected?.id===m.id?styles.selected:''}`} onClick={()=> setSelectedId(m.id)}>
                        <div className={styles.itemHeader}>
                          <span className={styles.sender}>{m.name || '—'}</span>
                          <span className={styles.date}>{m.createdAt || ''}</span>
                        </div>
                        <div className={styles.subject}>{m.serviceName || 'Appointment'}</div>
                        <div className={styles.snippet}>{m.message || '—'}</div>
                        <div className={styles.metaRow}>
                          <span className={`${styles.badge} ${styles.badgeGreen}`}>Avg <Stars value={m.avg||0} /></span>
                          <span className={`${styles.badge} ${styles.badgeBlue}`}>{m.status||'—'}</span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </aside>

              <section className={styles.detailPane}>
                {!selected ? (
                  <div className={styles.empty}>Select a feedback to view</div>
                ) : (
                  <div className={styles.detailCard}>
                    <div className={styles.detailHeader}>
                      <h2>{selected.serviceName || 'Appointment Feedback'}</h2>
                      <div className={styles.headerActions}>
                        <button className={styles.btnGhost} onClick={() => sendThankYou(selected)}>Send a Thank You Email</button>
                      </div>
                    </div>

                    <div className={styles.detailMeta}>
                      <div>
                        <div className={styles.metaLabel}>From</div>
                        <div className={styles.metaValue}>{selected.name || '—'}</div>
                      </div>
                      <div>
                        <div className={styles.metaLabel}>Email</div>
                        <div className={styles.metaValue}>{selected.email || '—'}</div>
                      </div>
                      <div>
                        <div className={styles.metaLabel}>Phone</div>
                        <div className={styles.metaValue}>{selected.phone || '—'}</div>
                      </div>
                      <div>
                        <div className={styles.metaLabel}>Appt Date/Time</div>
                        <div className={styles.metaValue}>{[selected.date, selected.time].filter(Boolean).join(' · ') || '—'}</div>
                      </div>
                      <div>
                        <div className={styles.metaLabel}>Status</div>
                        <div className={styles.metaValue}>{selected.status || '—'}</div>
                      </div>
                      <div>
                        <div className={styles.metaLabel}>Overall</div>
                        <div className={styles.metaValue}><Stars value={selected.avg || 0} /></div>
                      </div>
                    </div>

                    <div className={styles.grid}>
                      <div className={styles.kv}><div className={styles.k}>Easy Booking</div><div className={styles.v}><Stars value={selected.ratings?.bookingEase||0} /></div></div>
                      <div className={styles.kv}><div className={styles.k}>Fast Transaction</div><div className={styles.v}><Stars value={selected.ratings?.speed||0} /></div></div>
                      <div className={styles.kv}><div className={styles.k}>Great Staff</div><div className={styles.v}><Stars value={selected.ratings?.staff||0} /></div></div>
                      <div className={styles.kv}><div className={styles.k}>Clean Facility</div><div className={styles.v}><Stars value={selected.ratings?.cleanliness||0} /></div></div>
                      <div className={styles.kv}><div className={styles.k}>Overall Experience</div><div className={styles.v}><Stars value={selected.ratings?.overall||0} /></div></div>
                    </div>

                    {selected.message && (
                      <div className={styles.body}>{selected.message}</div>
                    )}

                    {/* Actions removed per request: no bottom reply/print */}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
