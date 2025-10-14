import React, { useEffect, useMemo, useState } from 'react';
import styles from './FeedbackPage.module.css';
import appointmentsService from '/src/services/AppointmentsService';
import { useToast } from '/src/components/shared/toast/ToastProvider.jsx';
import { ref as dbRef, push as dbPush, update as dbUpdate } from 'firebase/database';
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
  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 12; // show 12 feedback items per page (adjust as needed)
  const [sendingId, setSendingId] = useState(''); // row currently sending thank you
  const [errorMsg, setErrorMsg] = useState('');

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

  // Reset page if filters change
  useEffect(() => { setPage(1); }, [query, sort]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageStart = (page - 1) * pageSize;
  const pageEnd = pageStart + pageSize;
  const pageItems = filtered.slice(pageStart, pageEnd);

  const selected = useMemo(() => filtered.find((x) => x.id === selectedId) || filtered[0], [filtered, selectedId]);

  const buildThankYouEmail = (row) => {
    const name = row?.name || 'Customer';
    const svc = row?.serviceName || 'your appointment';
    const dt = [row?.date, row?.time].filter(Boolean).join(' • ');
    const r = row?.ratings || {};
    const ratingItems = [
      ['Easy Booking', r.bookingEase],
      ['Fast Transaction', r.speed],
      ['Great Staff', r.staff],
      ['Clean Facility', r.cleanliness],
      ['Overall Experience', r.overall],
    ].filter(([_, val]) => typeof val === 'number');

    // Plain text (fallback)
    const textParts = [];
    textParts.push(`Hi ${name},`);
    textParts.push('');
    textParts.push('Thank you for sharing your feedback. We truly appreciate your time—it helps us improve our services.');
    textParts.push('');
    textParts.push(`Service: ${svc}`);
    if (dt) textParts.push(`Date/Time: ${dt}`);
    if (ratingItems.length) {
      textParts.push('');
      textParts.push('Your ratings:');
      ratingItems.forEach(([label,val]) => textParts.push(`• ${label}: ${val} / 5`));
    }
    if (row?.message) {
      textParts.push('');
      textParts.push('Your comment:');
      textParts.push(`"${row.message}"`);
    }
    textParts.push('');
    textParts.push('Thank you again for helping us serve you better.');
    textParts.push('Prime Medical Laboratory');

    const text = textParts.join('\n');

    // HTML version (for Trigger Email extension styling)
    const html = `<!DOCTYPE html><html><head><meta charSet="utf-8"/><title>Thank You</title></head><body style="font-family:Arial,Helvetica,sans-serif;line-height:1.5;margin:0;padding:0;background:#f8fafc;color:#0f172a;">
      <table role="presentation" width="100%" style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden"> 
        <tr><td style="background:linear-gradient(90deg,#0ea5e9,#22d3ee);padding:18px 24px;color:#ffffff;font-size:20px;font-weight:700;letter-spacing:.5px">Prime Medical Laboratory</td></tr>
        <tr><td style="padding:24px"> 
          <p style="margin:0 0 16px 0;">Hi <strong>${name}</strong>,</p>
          <p style="margin:0 0 16px 0;">Thank you for sharing your feedback. We truly appreciate your time—it helps us continue improving our services.</p>
          <div style="background:#f1f5f9;border:1px solid #e2e8f0;border-radius:10px;padding:16px;margin:0 0 20px 0;">
            <table role="presentation" width="100%" style="border-collapse:collapse;font-size:14px;">
              <tbody>
                <tr><td style="padding:4px 0;font-weight:600;width:120px;">Service</td><td style="padding:4px 0;">${svc}</td></tr>
                ${dt ? `<tr><td style="padding:4px 0;font-weight:600;">Date/Time</td><td style=\"padding:4px 0;\">${dt}</td></tr>`: ''}
              </tbody>
            </table>
          </div>
          ${ratingItems.length ? `<h3 style="font-size:15px;margin:0 0 8px 0;color:#0f172a;">Your Ratings</h3>
          <table role="presentation" width="100%" style="border-collapse:collapse;font-size:13px;margin:0 0 20px 0;">
            <tbody>
              ${ratingItems.map(([label,val]) => `<tr><td style=\"padding:6px 10px;border:1px solid #e2e8f0;background:#f8fafc;font-weight:600;width:55%;\">${label}</td><td style=\"padding:6px 10px;border:1px solid #e2e8f0;background:#ffffff;\">${val} / 5</td></tr>`).join('')}
            </tbody>
          </table>` : ''}
          ${row?.message ? `<div style="margin:0 0 20px 0;">
            <h3 style="font-size:15px;margin:0 0 8px 0;color:#0f172a;">Your Comment</h3>
            <blockquote style="margin:0;padding:14px 16px;border-left:4px solid #0ea5e9;background:#f0f9ff;border-radius:8px;font-style:italic;color:#334155;">${row.message.replace(/</g,'&lt;')}</blockquote>
          </div>` : ''}
          <p style="margin:0 0 16px 0;">Thank you again for helping us serve you better.</p>
          <p style="margin:0;font-weight:600;">Prime Medical Laboratory</p>
        </td></tr>
        <tr><td style="padding:18px 24px;background:#f1f5f9;text-align:center;font-size:11px;color:#64748b;">This message was sent because you provided feedback for a recent appointment.</td></tr>
      </table>
    </body></html>`;
    return { text, html };
  };

  // Helper to enqueue a thank-you email and mark flags
  const enqueueThankYou = async (row) => {
    if (!row) throw new Error('Missing row');
    if (!row.email) throw new Error('No recipient email');
    if (row.thanked) throw new Error('This feedback was already thanked.');
    const subject = 'Thank you for your feedback';
    const { text, html } = buildThankYouEmail(row);
    // Push both text and html (extension will choose html)
    await dbPush(dbRef(usersDB, 'emailQueue'), { to: row.email, subject, text, html });
    const nowIso = new Date().toISOString();
    try { await dbUpdate(dbRef(usersDB, `appointments/${row.id}/FEEDBACK`), { THANKED: true, THANKED_AT: nowIso }); } catch(_) {}
    setItems(prev => prev.map(i => i.id === row.id ? { ...i, thanked: true, thankedAt: nowIso } : i));
  };

  const sendThankYou = async (row) => {
    setErrorMsg('');
    if (!row || !row.email) {
      show({ type: 'error', title: 'No email', message: 'This feedback has no email address to reply to.' });
      return;
    }
    if (row.thanked) {
      show({ type: 'error', title: 'Already sent', message: 'A thank you email was already sent for this feedback.' });
      return;
    }
    const doSend = async () => {
      try {
        setSendingId(row.id);
        await enqueueThankYou(row);
        show({ type: 'success', title: 'Email queued', message: 'Thank you email queued.' });
      } catch (e) {
        const m = e?.message || 'Failed to send email.';
        setErrorMsg(m);
        show({ type: 'error', title: 'Send failed', message: m });
      } finally {
        setSendingId('');
      }
    };
    show({
      type: 'success',
      title: 'Send thank you?',
      message: `Send a thank you email to ${row.email}?`,
      duration: 0,
      actions: [
        { label: 'Cancel', kind: 'ghost', onClick: () => {} },
        { label: 'Send', kind: 'confirm', onClick: doSend },
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
              {errorMsg && <div style={{ color: '#dc2626', fontSize: 12, fontWeight: 600 }}>{errorMsg}</div>}
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
                  <>
                    <ul className={styles.list}>
                      {pageItems.map((m) => (
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
                            {m.thanked && <span className={`${styles.badge} ${styles.badgeGray}`} title={m.thankedAt ? `Thanked at ${m.thankedAt}` : 'Thank you email sent'}>Thanked ✓</span>}
                          </div>
                        </li>
                      ))}
                    </ul>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 4px 4px', flexWrap:'wrap', gap:8 }}>
                      <div style={{ fontSize:12, fontWeight:600, color:'#475569' }}>
                        {filtered.length === 0 ? '0 items' : `Showing ${pageStart+1}–${Math.min(pageEnd, filtered.length)} of ${filtered.length}`}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <button className={styles.btnGhost} disabled={page<=1} onClick={()=> setPage(p=> Math.max(1, p-1))}>Prev</button>
                        <span style={{ fontSize:12, fontWeight:600 }}>Page {page} / {totalPages}</span>
                        <button className={styles.btnGhost} disabled={page>=totalPages} onClick={()=> setPage(p=> Math.min(totalPages, p+1))}>Next</button>
                      </div>
                    </div>
                  </>
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
                        <button
                          className={styles.btnGhost}
                          disabled={sendingId === selected.id || selected.thanked}
                          onClick={() => sendThankYou(selected)}
                          title={selected.thanked ? 'Already thanked' : 'Send a thank you email'}
                        >
                          {selected.thanked ? 'Already Thanked' : (sendingId === selected.id ? 'Sending…' : 'Send Thank You Email')}
                        </button>
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
                    {selected.thanked && (
                      <div style={{ fontSize:11, fontWeight:600, color:'#16a34a', background:'#dcfce7', border:'1px solid #bbf7d0', padding:'6px 10px', borderRadius:8 }}>
                        Thank you email sent {selected.thankedAt ? `at ${selected.thankedAt}` : ''}
                      </div>
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
