import React, { useEffect, useMemo, useRef, useState } from "react";
import styles from "./BookAppointment.module.css";
import { onValue, ref } from "firebase/database";
import { usersDB } from "/src/config/firebase-config";

// Helpers (duplicated locally for self-contained reuse)
function pad(n) { return String(n).padStart(2, "0"); }
function minutesFromHHMM(hhmm) { const [h,m] = hhmm.split(":").map(Number); return h*60 + m; }
function toHHMM(mins) { const h = Math.floor(mins/60), m = mins%60; return `${pad(h)}:${pad(m)}`; }
function labelFromHHMM(hhmm) { const [h,m]=hhmm.split(":").map(Number); const ampm=h>=12?"PM":"AM"; const h12=h%12===0?12:h%12; return `${h12}:${pad(m)} ${ampm}`; }
function hourLabelFromHHMM(hhmm) { const [h,m] = hhmm.split(":").map(Number); if (m !== 0) return ""; const ampm = h >= 12 ? "PM" : "AM"; const h12 = h % 12 === 0 ? 12 : h % 12; return `${h12} ${ampm}`; }
function gmtOffsetLabel(date = new Date()) { const offsetMinutes = -date.getTimezoneOffset(); const sign = offsetMinutes >= 0 ? '+' : '-'; const abs = Math.abs(offsetMinutes); const hours = Math.floor(abs / 60); const mins = abs % 60; const hh = String(hours).padStart(2, '0'); const mm = mins ? String(mins).padStart(2, '0') : '00'; return `GMT${sign}${hh}${mm !== '00' ? ':'+mm : ''}`; }
function toLocalDateStringYYYYMMDD(d) { const y=d.getFullYear(); const m=pad(d.getMonth()+1); const day=pad(d.getDate()); return `${y}-${m}-${day}`; }

const today = new Date();
const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1);
const tomorrowStr = toLocalDateStringYYYYMMDD(tomorrow);

export default function ScheduleCalendar({
  open,
  onClose,
  activeItem,
  serviceKey,
  date,
  setDate,
  time,
  setTime,
}) {
  // Internal state for view
  const [timeOfDay, setTimeOfDay] = useState('Morning');
  const viewMode = 'week';

  // Lock background scroll when open (robust when reused elsewhere)
  useEffect(() => {
    try { if (open) document.body.classList.add('modal-no-scroll'); else document.body.classList.remove('modal-no-scroll'); } catch(_) {}
    return () => { try { document.body.classList.remove('modal-no-scroll'); } catch(_) {} };
  }, [open]);

  // Reset period to Morning whenever opened
  useEffect(() => { if (open) setTimeOfDay('Morning'); }, [open]);

  // Build day slots for a given date string (YYYY-MM-DD)
  function computeSlotsForDate(dateStr) {
    if (!dateStr || !activeItem) return [];
    const d = new Date(dateStr + 'T00:00:00');
    const dow = d.getDay(); // 0=Sun ... 6=Sat
    // Defaults 7AM–7PM
    let start = '07:00';
    let end = '19:00';
    const step = 30; // minutes
    const availRaw = String(activeItem.availability || '');
    const parseTime = (s) => {
      const m = s.match(/(1[0-2]|0?[1-9]):([0-5][0-9])\s*(am|pm)/i);
      if (!m) return null;
      let h = parseInt(m[1], 10);
      const mins = parseInt(m[2], 10);
      const ampm = m[3].toLowerCase();
      if (ampm === 'pm' && h !== 12) h += 12;
      if (ampm === 'am' && h === 12) h = 0;
      return toHHMM(h * 60 + mins);
    };
    const rangeMatch = availRaw.match(/(\d{1,2}:\d{2}\s*[ap]m)\s*-\s*(\d{1,2}:\d{2}\s*[ap]m)/i);
    if (rangeMatch) { const s = parseTime(rangeMatch[1]); const e = parseTime(rangeMatch[2]); if (s && e) { start = s; end = e; } }
    const regularMatch = availRaw.match(/regular[^\d]*(\d{1,2}:\d{2}\s*[ap]m)\s*-\s*(\d{1,2}:\d{2}\s*[ap]m)/i);
    if (regularMatch) { const s = parseTime(regularMatch[1]); const e = parseTime(regularMatch[2]); if (s && e) { start = s; end = e; } }
    if (dow === 0) { // Sunday specific
      const sunMatch = availRaw.match(/sun(day)?[^\d]*(\d{1,2}:\d{2}\s*[ap]m)\s*-\s*(\d{1,2}:\d{2}\s*[ap]m)/i);
      if (sunMatch) { const s = parseTime(sunMatch[2]); const e = parseTime(sunMatch[3]); if (s && e) { start = s; end = e; } }
    }
    const startMin = minutesFromHHMM(start); const endMin = minutesFromHHMM(end);
    const times = []; for (let t = startMin; t < endMin; t += step) times.push(toHHMM(t));
    return times;
  }

  const slots = useMemo(() => computeSlotsForDate(date), [date, activeItem]);

  // Subscriptions for counts
  const [slotCounts, setSlotCounts] = useState({}); // day view counts (used for row labels tooltips)
  useEffect(() => {
    const serviceId = serviceKey;
    if (!serviceId || !date) return;
    const countsRef = ref(usersDB, `appointmentSlotCounts/${serviceId}/${date}`);
    const unsub = onValue(countsRef, (snap) => { setSlotCounts(snap.exists() ? (snap.val() || {}) : {}); }, () => setSlotCounts({}));
    return () => { try { unsub && unsub(); } catch(_) {} };
  }, [serviceKey, date]);

  // Week view helpers
  const weekDates = useMemo(() => {
    const base = date ? new Date(date + 'T00:00:00') : new Date();
    const day = base.getDay();
    const sunday = new Date(base); sunday.setDate(base.getDate() - day);
    const arr = []; for (let i=0;i<7;i++) { const d = new Date(sunday); d.setDate(sunday.getDate()+i); arr.push(toLocalDateStringYYYYMMDD(d)); }
    return arr;
  }, [date]);

  const weekDaySlots = useMemo(() => {
    const obj = {};
    weekDates.forEach(dStr => {
      const daySlots = computeSlotsForDate(dStr).filter(hhmm => {
        const mins = minutesFromHHMM(hhmm);
        return timeOfDay === 'Morning' ? mins < minutesFromHHMM('12:00') : mins >= minutesFromHHMM('12:00');
      });
      obj[dStr] = daySlots;
    });
    return obj;
  }, [weekDates, activeItem, timeOfDay]);

  const rowTimes = useMemo(() => {
    const set = new Set();
    weekDates.forEach(dStr => (weekDaySlots[dStr]||[]).forEach(t => set.add(t)));
    const arr = Array.from(set).sort((a,b)=>minutesFromHHMM(a)-minutesFromHHMM(b));
    if (arr.length > 0) return arr;
    const fallbackStart = timeOfDay === 'Morning' ? '07:00' : '12:00';
    const fallbackEnd   = timeOfDay === 'Morning' ? '12:00' : '19:00';
    const startM = minutesFromHHMM(fallbackStart); const endM = minutesFromHHMM(fallbackEnd);
    const tmp = []; for (let t = startM; t < endM; t += 30) tmp.push(toHHMM(t));
    return tmp;
  }, [weekDates, weekDaySlots, timeOfDay]);

  const [slotCountsByDate, setSlotCountsByDate] = useState({});
  useEffect(() => {
    const serviceId = serviceKey; if (!serviceId) return; if (!open) return;
    const unsubs = [];
    weekDates.forEach(dStr => {
      const countsRef = ref(usersDB, `appointmentSlotCounts/${serviceId}/${dStr}`);
      const unsub = onValue(countsRef, (snap) => {
        const val = snap.exists() ? (snap.val() || {}) : {};
        setSlotCountsByDate(prev => ({ ...prev, [dStr]: val }));
      }, () => setSlotCountsByDate(prev => ({ ...prev, [dStr]: {} })));
      unsubs.push(unsub);
    });
    return () => { unsubs.forEach(u => { try { u && u(); } catch(_) {} }); };
  }, [open, serviceKey, JSON.stringify(weekDates)]);

  // Now line
  const [nowMins, setNowMins] = useState(() => { const n = new Date(); return n.getHours()*60 + n.getMinutes(); });
  useEffect(() => {
    const todayStr = toLocalDateStringYYYYMMDD(new Date());
    if (date !== todayStr) return;
    const id = setInterval(() => { const n = new Date(); setNowMins(n.getHours()*60 + n.getMinutes()); }, 60000);
    return () => clearInterval(id);
  }, [date]);
  const showNowLine = useMemo(() => toLocalDateStringYYYYMMDD(new Date()) === date, [date]);

  // Day scroller days
  const dateScrollerDays = useMemo(() => {
    const out = []; const start = new Date(); start.setHours(0,0,0,0);
    for (let i = 0; i < 60; i++) { const d = new Date(start); d.setDate(start.getDate() + i); out.push({ str: toLocalDateStringYYYYMMDD(d), d }); }
    return out;
  }, []);

  // Date scroller refs + effects
  const dateScrollerRef = useRef(null);
  const dateChipRefs = useRef(new Map());
  const programmaticScrollRef = useRef(false);
  useEffect(() => {
    const wrap = dateScrollerRef.current; if (!wrap || !date) return;
    const el = wrap.querySelector(`[data-date="${date}"]`);
    if (el) {
      try {
        const wrapRect = wrap.getBoundingClientRect(); const elRect = el.getBoundingClientRect();
        const wrapCenter = (wrapRect.left + wrapRect.right) / 2; const elCenter = (elRect.left + elRect.right) / 2;
        const delta = elCenter - wrapCenter; if (Math.abs(delta) > 2) { programmaticScrollRef.current = true; wrap.scrollTo({ left: wrap.scrollLeft + delta, behavior: 'smooth' }); setTimeout(()=>{ programmaticScrollRef.current=false; },300); }
      } catch (_) { if (typeof el.scrollIntoView === 'function') el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); }
    }
  }, [date, open]);
  useEffect(() => {
    const wrap = dateScrollerRef.current; if (!wrap) return;
    let t = null;
    const selectCenter = () => {
      if (programmaticScrollRef.current) return;
      try {
        const wrapRect = wrap.getBoundingClientRect(); const wrapCenter = (wrapRect.left + wrapRect.right) / 2;
        const chips = Array.from(wrap.querySelectorAll('button[data-date]'));
        let best = null, bestDist = Infinity;
        chips.forEach(btn => { if (btn.classList.contains(styles.dateChipDisabled)) return; const r=btn.getBoundingClientRect(); const c=(r.left+r.right)/2; const dist=Math.abs(c-wrapCenter); if (dist<bestDist){bestDist=dist; best=btn;} });
        if (best) { const nextDate = best.getAttribute('data-date'); if (nextDate && nextDate !== date) { setDate(nextDate); setTime(''); } }
      } catch(_) {}
    };
    const onWheel = (e) => { try { if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) { e.preventDefault(); wrap.scrollLeft += e.deltaY; } } catch(_) {} if (t) clearTimeout(t); t = setTimeout(selectCenter, 120); };
    const onScroll = () => { if (programmaticScrollRef.current) return; if (t) clearTimeout(t); t = setTimeout(selectCenter, 140); };
    try { wrap.addEventListener('wheel', onWheel, { passive: false }); } catch(_) { wrap.addEventListener('wheel', onWheel); }
    wrap.addEventListener('scroll', onScroll);
    return () => { try { wrap.removeEventListener('wheel', onWheel); } catch(_) {} try { wrap.removeEventListener('scroll', onScroll); } catch(_) {} if (t) clearTimeout(t); };
  }, [date, setDate, setTime]);

  if (!open) return null;

  const capacity = Number(activeItem?.capacity ?? activeItem?.SLOT ?? 1) || 1;

  return (
    <div className={`${styles.modalOverlay} ${styles.modalOverlayTop}`} role="dialog" aria-modal="true" aria-labelledby="scheduleFsTitle" onClick={(e)=>{ if (e.target===e.currentTarget) onClose && onClose(); }}>
      <div className={`${styles.modalCard} ${styles.modalFullscreen}`}>
        <div className={styles.modalFsTop}>
          <div className={styles.calHeaderLeft}>
            <button
              type="button"
              className={styles.calNavBtn}
              onClick={() => {
                if (!date) { setDate(tomorrowStr); setTime(""); return; }
                const d = new Date(date + 'T00:00:00'); d.setDate(d.getDate() - 7);
                const prev = toLocalDateStringYYYYMMDD(d); setDate(prev); setTime("");
              }}
              aria-label={'Previous week'}
            >◀</button>
            <button
              type="button"
              className={styles.calNavBtn}
              onClick={() => {
                const base = date ? new Date(date + 'T00:00:00') : new Date();
                base.setDate(base.getDate() + 7); const next = toLocalDateStringYYYYMMDD(base);
                setDate(next); setTime("");
              }}
              aria-label={'Next week'}
            >▶</button>
            <div id="scheduleFsTitle" className={styles.calTitle}>{date ? new Date(date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Select a date'}</div>
            {date && time && (
              <span className={styles.selectedChip} title="Current selection">
                {new Date(date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
                <span aria-hidden>•</span>
                {labelFromHHMM(time)}
              </span>
            )}
          </div>
          <div className={styles.calHeaderRight}>
            <div className={styles.viewTabs}>
              {['week'].map(v => (
                <button key={v} type="button" className={`${styles.tab} ${styles.activeTab}`}>{v[0].toUpperCase()+v.slice(1)}</button>
              ))}
            </div>
            <input
              type="date"
              className={styles.input}
              value={date}
              min={toLocalDateStringYYYYMMDD(new Date())}
              onChange={(e)=>{ const v=e.target.value; if(!v){ return; } const todayStrLocal = toLocalDateStringYYYYMMDD(new Date()); const clamped = v < todayStrLocal ? todayStrLocal : v; setDate(clamped); setTime(""); }}
            />
            {time && (
              <button type="button" className={`${styles.primaryBtn} ${styles.primaryBtnSm}`} onClick={()=> onClose && onClose()} title="Confirm this selection">Confirm</button>
            )}
            <button type="button" className={styles.ghostBtn} onClick={()=> onClose && onClose()}>Close</button>
          </div>
        </div>
        <div className={styles.modalFsBody}>
          <div className={styles.ruleNotice} role="note">
            Booking opens starting tomorrow. You may book any date from tomorrow onward (today is not available).
          </div>
          <div className={styles.dateScrollerWrap} role="tablist" aria-label="Browse days" ref={dateScrollerRef}>
            {dateScrollerDays.map(({ str, d }) => {
              const isActive = date === str;
              const weekday = d.toLocaleDateString(undefined, { weekday: 'short' });
              const day = d.getDate();
              const month = d.toLocaleDateString(undefined, { month: 'short' });
              const isBeforeAllowed = str < tomorrowStr;
              return (
                <button
                  key={str}
                  role="tab"
                  aria-selected={isActive}
                  className={`${styles.dateChip} ${isActive ? styles.dateChipActive : ''} ${isBeforeAllowed ? styles.dateChipDisabled : ''}`}
                  ref={(el) => { if (el) dateChipRefs.current.set(str, el); else dateChipRefs.current.delete(str); }}
                  onClick={() => { if (isBeforeAllowed) return; setDate(str); setTime(''); }}
                  title={weekday + ', ' + month + ' ' + day}
                  data-date={str}
                >
                  <span className={styles.dateChipDow}>{weekday}</span>
                  <span className={styles.dateChipDay}>{day}</span>
                  <span className={styles.dateChipMon}>{month}</span>
                </button>
              );
            })}
          </div>

          {/* Morning section */}
          <div className={styles.periodSection}>
            <div className={styles.periodLabel}>Morning</div>
            <div className={styles.weekGrid} role="grid" aria-label="Week view (Morning)">
              <div className={styles.weekHeader} role="row">
                <div className={styles.weekTimeCol} aria-hidden>
                  <div className={styles.tzLabel}>{gmtOffsetLabel()}</div>
                </div>
                {weekDates.map(dStr => {
                  const dObj = new Date(dStr + 'T00:00:00');
                  const isToday = toLocalDateStringYYYYMMDD(new Date()) === dStr;
                  const todayStrLocal = toLocalDateStringYYYYMMDD(new Date());
                  const isPast = dStr < todayStrLocal;
                  const isActiveCol = date === dStr;
                  const weekday = dObj.toLocaleDateString(undefined, { weekday: 'short' });
                  const dateNum = dObj.getDate();
                  const month = dObj.toLocaleDateString(undefined, { month: 'short' });
                  const headerCls = `${styles.weekHeaderCell} ${isPast ? styles.weekHeaderCellPast : ''} ${isActiveCol ? styles.weekHeaderCellActive : ''}`;
                  return (
                    <div key={dStr} className={headerCls} role="columnheader">
                      <span className={styles.weekHeaderDay}>{weekday}</span>
                      <span className={`${styles.weekHeaderDate} ${isToday ? styles.isToday : ''}`}>{dateNum}</span>
                      <span className={styles.weekHeaderMonth}>{month}</span>
                    </div>
                  );
                })}
              </div>
              <div className={styles.weekBody}>
                <div className={styles.weekTimeCol} aria-hidden>
                  {rowTimes.map(h => (
                    <div key={h} className={styles.weekTimeCell}>{hourLabelFromHHMM(h)}</div>
                  ))}
                </div>
                {weekDates.map(dStr => {
                  const counts = slotCountsByDate[dStr] || {};
                  const colSlots = (weekDaySlots[dStr] || []).length ? (weekDaySlots[dStr] || []) : rowTimes;
                  const todayStrLocal = toLocalDateStringYYYYMMDD(new Date());
                  const isPast = dStr < todayStrLocal;
                  const isActiveCol = date === dStr;
                  const colCls = `${styles.weekDayCol} ${isPast ? styles.weekDayColPast : ''} ${isActiveCol ? styles.weekDayColActive : ''}`;
                  return (
                    <div key={dStr} className={colCls} role="grid">
                      {(() => {
                        const todayStr = toLocalDateStringYYYYMMDD(new Date());
                        if (dStr !== todayStr || colSlots.length === 0) return null;
                        const first = colSlots[0];
                        const last = colSlots[colSlots.length - 1];
                        const firstM = minutesFromHHMM(first);
                        const lastM = minutesFromHHMM(last) + 30;
                        const clamped = Math.max(firstM, Math.min(nowMins, lastM));
                        const total = lastM - firstM;
                        const pct = total > 0 ? ((clamped - firstM) / total) * 100 : 0;
                        return (<><div className={styles.nowLine} style={{ top: `calc(${pct}% - 1px)` }} aria-hidden /><div className={styles.nowDot} style={{ top: `calc(${pct}% - 4px)` }} aria-hidden /></>);
                      })()}
                      {colSlots.map(hhmm => {
                        const isAllowedDate = dStr >= tomorrowStr; // allow tomorrow and onwards
                        const isPlaceholder = !(weekDaySlots[dStr] || []).includes(hhmm);
                        const count = isPlaceholder ? null : (Number(counts?.[hhmm] || 0) || 0);
                        const full = !isPlaceholder && count >= capacity;
                        const selected = !isPlaceholder && isAllowedDate && (date === dStr) && (time === hhmm);
                        return (
                          <button
                            key={hhmm}
                            type="button"
                            role="gridcell"
                            className={`${styles.slotCell} ${selected?styles.slotCellSelected:''} ${full?styles.slotCellFull:''}`}
                            onClick={() => { if (!isAllowedDate) return; setDate(dStr); if (!isPlaceholder && !full) setTime(hhmm); }}
                            title={!isAllowedDate ? `Booking starts tomorrow` : (isPlaceholder ? labelFromHHMM(hhmm) : `${labelFromHHMM(hhmm)} — ${count}/${capacity}`)}
                            aria-selected={selected}
                            aria-disabled={!isAllowedDate || isPlaceholder || full}
                          >
                            <div className={styles.cellContent}>
                              <div className={styles.cellPrimary}>{labelFromHHMM(hhmm)}</div>
                              <div className={styles.cellSecondary}>{isPlaceholder ? '—' : `${count}/${capacity}`}</div>
                            </div>
                            {!isPlaceholder && isAllowedDate && full && <span className={styles.slotBadge}>Full</span>}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Evening section */}
          <div className={styles.periodLabel}>Evening</div>
          {(() => {
            const eveningWeekDaySlots = (() => {
              const obj = {}; weekDates.forEach(dStr => { const daySlots = computeSlotsForDate(dStr).filter(h => minutesFromHHMM(h) >= minutesFromHHMM('12:00')); obj[dStr] = daySlots; }); return obj;
            })();
            const eveningRowTimes = (() => {
              const set = new Set(); weekDates.forEach(dStr => (eveningWeekDaySlots[dStr]||[]).forEach(t => set.add(t)));
              const arr = Array.from(set).sort((a,b)=>minutesFromHHMM(a)-minutesFromHHMM(b));
              if (arr.length > 0) return arr; const startM = minutesFromHHMM('12:00'); const endM = minutesFromHHMM('19:00'); const tmp = []; for (let t=startM;t<endM;t+=30) tmp.push(toHHMM(t)); return tmp;
            })();
            return (
              <div className={styles.weekGrid} role="grid" aria-label="Week view (Evening)">
                <div className={styles.weekHeader} role="row">
                  <div className={styles.weekTimeCol} aria-hidden />
                  {weekDates.map(dStr => {
                    const dObj = new Date(dStr + 'T00:00:00');
                    const weekday = dObj.toLocaleDateString(undefined, { weekday: 'short' });
                    const dateNum = dObj.getDate();
                    const month = dObj.toLocaleDateString(undefined, { month: 'short' });
                    const isSunday = dObj.getDay() === 0;
                    const todayStrLocal = toLocalDateStringYYYYMMDD(new Date());
                    const isPast = dStr < todayStrLocal;
                    const isActiveCol = date === dStr;
                    const headerCls = `${styles.weekHeaderCell} ${isSunday ? styles.weekHeaderCellPlaceholder : ''} ${isPast ? styles.weekHeaderCellPast : ''} ${isActiveCol ? styles.weekHeaderCellActive : ''}`;
                    return (
                      <div key={dStr} className={headerCls} role="columnheader">
                        <span className={styles.weekHeaderDay}>{weekday}</span>
                        <span className={styles.weekHeaderDate}>{dateNum}</span>
                        <span className={styles.weekHeaderMonth}>{month}</span>
                        {isSunday && (
                          <span className={styles.closedBadge} aria-label="Closed this evening">Closed</span>
                        )}
                      </div>
                    );
                  })}
                </div>
                <div className={styles.weekBody}>
                  <div className={styles.weekTimeCol} aria-hidden>
                    {eveningRowTimes.map(h => (
                      <div key={h} className={styles.weekTimeCell}>{hourLabelFromHHMM(h)}</div>
                    ))}
                  </div>
                  {weekDates.map(dStr => {
                    const counts = slotCountsByDate[dStr] || {};
                    const dObj = new Date(dStr + 'T00:00:00');
                    const isSunday = dObj.getDay() === 0;
                    if (isSunday) {
                      return (
                        <div key={dStr} className={`${styles.weekDayCol} ${styles.weekDayColPlaceholder}`} role="grid" aria-hidden="true">
                          {eveningRowTimes.map(hhmm => (
                            <button key={hhmm} type="button" role="gridcell" className={styles.slotCell} aria-hidden="true" />
                          ))}
                        </div>
                      );
                    }
                    const colSlots = (eveningWeekDaySlots[dStr] || []).length ? (eveningWeekDaySlots[dStr] || []) : eveningRowTimes;
                    const todayStrLocal = toLocalDateStringYYYYMMDD(new Date());
                    const isPast = dStr < todayStrLocal;
                    const isActiveCol = date === dStr;
                    const colCls = `${styles.weekDayCol} ${isPast ? styles.weekDayColPast : ''} ${isActiveCol ? styles.weekDayColActive : ''}`;
                    return (
                      <div key={dStr} className={colCls} role="grid">
                        {colSlots.map(hhmm => {
                          const isAllowedDate = dStr >= tomorrowStr;
                          const isPlaceholder = !(eveningWeekDaySlots[dStr] || []).includes(hhmm);
                          const count = isPlaceholder ? null : (Number(counts?.[hhmm] || 0) || 0);
                          const full = !isPlaceholder && count >= capacity;
                          const selected = !isPlaceholder && isAllowedDate && (date === dStr) && (time === hhmm);
                          return (
                            <button key={hhmm} type="button" role="gridcell" className={`${styles.slotCell} ${selected?styles.slotCellSelected:''} ${full?styles.slotCellFull:''}`} onClick={() => { if (!isAllowedDate) return; setDate(dStr); if (!isPlaceholder && !full) setTime(hhmm); }} title={!isAllowedDate ? `Booking starts tomorrow` : (isPlaceholder ? labelFromHHMM(hhmm) : `${labelFromHHMM(hhmm)} — ${count}/${capacity}`)} aria-selected={selected} aria-disabled={!isAllowedDate || isPlaceholder || full}>
                              <div className={styles.cellContent}>
                                <div className={styles.cellPrimary}>{labelFromHHMM(hhmm)}</div>
                                <div className={styles.cellSecondary}>{isPlaceholder ? '—' : `${count}/${capacity}`}</div>
                              </div>
                              {!isPlaceholder && isAllowedDate && full && <span className={styles.slotBadge}>Full</span>}
                            </button>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
          <div className={styles.scrollEndPad} aria-hidden />
        </div>
      </div>
    </div>
  );
}
