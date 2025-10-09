import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import styles from "./BookAppointment.module.css";
import appointmentsService from "/src/services/AppointmentsService";
import authService from "/src/services/AuthService";
import servicePackagesService from "/src/services/ServicePackagesService";
import singleServicesService from "/src/services/SingleServicesService";
import { get, ref, onValue } from "firebase/database";
import { usersDB } from "/src/config/firebase-config";

// Helpers
function pad(n) { return String(n).padStart(2, "0"); }
function minutesFromHHMM(hhmm) { const [h,m] = hhmm.split(":").map(Number); return h*60 + m; }
function toHHMM(mins) { const h = Math.floor(mins/60), m = mins%60; return `${pad(h)}:${pad(m)}`; }
function labelFromHHMM(hhmm) { const [h,m]=hhmm.split(":").map(Number); const ampm=h>=12?"PM":"AM"; const h12=h%12===0?12:h%12; return `${h12}:${pad(m)} ${ampm}`; }
function hourLabelFromHHMM(hhmm) {
  const [h,m] = hhmm.split(":").map(Number);
  if (m !== 0) return "";
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12} ${ampm}`;
}
function gmtOffsetLabel(date = new Date()) {
  const offsetMinutes = -date.getTimezoneOffset(); // e.g. +480 for GMT+8
  const sign = offsetMinutes >= 0 ? '+' : '-';
  const abs = Math.abs(offsetMinutes);
  const hours = Math.floor(abs / 60);
  const mins = abs % 60;
  const hh = String(hours).padStart(2, '0');
  const mm = mins ? String(mins).padStart(2, '0') : '00';
  return `GMT${sign}${hh}${mm !== '00' ? ':'+mm : ''}`;
}
function toLocalDateStringYYYYMMDD(d) { const y=d.getFullYear(); const m=pad(d.getMonth()+1); const day=pad(d.getDate()); return `${y}-${m}-${day}`; }

// Simple policy: require at least 1 day of age (adjust as needed)
const minAgeDays = 1;
const today = new Date();
const tomorrow = new Date(today); tomorrow.setDate(today.getDate()+1);
const tomorrowStr = toLocalDateStringYYYYMMDD(tomorrow);
const bdayMax = new Date(today); bdayMax.setDate(today.getDate() - minAgeDays);
const birthdayMaxStr = toLocalDateStringYYYYMMDD(bdayMax);

export function BookAppointment() {
  const location = useLocation();

  // Notifications modal
  const [modal, setModal] = useState({ open: false, type: 'info', title: '', message: '' });
  const showModal = ({ type = 'info', title = '', message = '' } = {}) => setModal({ open: true, type, title, message });
  const closeModal = () => setModal(m => ({ ...m, open: false }));

  // Booking modal and state
  const [rulesOpen, setRulesOpen] = useState(false);
  const [booking, setBooking] = useState(false);

  // Selection state
  const [activeItem, setActiveItem] = useState(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("Morning");
  const [viewMode, setViewMode] = useState("week"); // 'day' | 'week'
  const [scheduleOpen, setScheduleOpen] = useState(false);

  // Lock background scroll when schedule modal is open
  useEffect(() => {
    try {
      if (scheduleOpen) document.body.classList.add('modal-no-scroll');
      else document.body.classList.remove('modal-no-scroll');
    } catch (_) {}
    return () => { try { document.body.classList.remove('modal-no-scroll'); } catch (_) {} };
  }, [scheduleOpen]);

  // Patient form
  const [patient, setPatient] = useState({ firstName:"", lastName:"", phone:"", email:"", birthday:"", gender:"", complaint:"", notes:"" });
  const complaintRef = useRef(null);
  const notesRef = useRef(null);
  const slotsWrapRef = useRef(null);

  useEffect(() => {
    const auto = (el) => { if (!el) return; el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; };
    auto(complaintRef.current);
    auto(notesRef.current);
  }, [patient.complaint, patient.notes]);

  // Prefill patient profile
  useEffect(() => {
    const user = authService.currentUser;
    if (!user) return;
    (async () => {
      try {
        const snap = await get(ref(usersDB, `users/${user.uid}`));
        const dbUser = snap.exists() ? (snap.val() || {}) : {};
        setPatient((p) => ({
          ...p,
          firstName: p.firstName || dbUser.firstName || '',
          lastName: p.lastName || dbUser.lastName || '',
          phone: dbUser.phone || p.phone || '',
          email: dbUser.email || user.email || p.email || '',
          birthday: dbUser.birthday || p.birthday || '',
          gender: dbUser.gender || p.gender || '',
        }));
      } catch (_) {}
    })();
  }, []);

  // Catalogs
  const [packagesCatalog, setPackagesCatalog] = useState([]);
  const [servicesCatalog, setServicesCatalog] = useState([]);

  useEffect(() => {
    (async () => {
      try {
        const [pkgs, svcs] = await Promise.all([
          servicePackagesService.list(),
          singleServicesService.list(),
        ]);
        const mapPkg = (x) => ({
          id: x.id,
          title: x.NAME || x.name || 'Package',
          summary: x.DESC || x.SPECIAL_INSTRUCTION || '',
          availability: x.AVAILABILITY || '',
          capacity: x.SLOT ?? 1,
          price: x.DISCOUNTED_PRICE ?? x.ORIGINAL_PRICE,
          kind: 'package',
          serviceKey: x.SERVICE_PACKGE_ID || x.SERVICE_PACKAGE_ID || x.SERVICE_ID || x.id,
        });
        const mapSvc = (x) => ({
          id: x.id,
          title: x.NAME || x.name || 'Service',
          summary: x.DESC || x.SPECIAL_INSTRUCTIONS || '',
          availability: x.AVAILABILITY || '',
          capacity: x.SLOT ?? 1,
          price: x.DISCOUNTED_PRICE ?? x.ORIGINAL_PRICE,
          kind: 'service',
          serviceKey: x.SERVICE_ID || x.id,
        });
        setPackagesCatalog(pkgs.map(mapPkg));
        setServicesCatalog(svcs.map(mapSvc));
      } catch (_) {}
    })();
  }, []);

  // If navigated with preselected item
  useEffect(() => {
    const item = location.state && location.state.selectedItem;
    if (!item) return;
    const title = (item.title || '').toLowerCase();
    const all = [...servicesCatalog, ...packagesCatalog];
    const found = all.find(x => (x.title || '').toLowerCase() === title);
    if (found) setActiveItem(found);
  }, [location.state, servicesCatalog, packagesCatalog]);

  // Build day slots for a given date string (YYYY-MM-DD)
  function computeSlotsForDate(dateStr) {
    if (!dateStr || !activeItem) return [];
    const d = new Date(dateStr + 'T00:00:00');
    const dow = d.getDay(); // 0=Sun ... 6=Sat
    // Defaults from the original behavior (7AM–7PM)
    let start = '07:00';
    let end = '19:00';
    const step = 30; // minutes
    const availRaw = String(activeItem.availability || '');
    const avail = availRaw.toLowerCase();
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
    // Look for an explicit global range (e.g., "7:00 AM - 7:00 PM")
    const rangeMatch = availRaw.match(/(\d{1,2}:\d{2}\s*[ap]m)\s*-\s*(\d{1,2}:\d{2}\s*[ap]m)/i);
    if (rangeMatch) {
      const s = parseTime(rangeMatch[1]);
      const e = parseTime(rangeMatch[2]);
      if (s && e) { start = s; end = e; }
    }
    // Allow phrases like "Regular Schedule: 7:00 AM - 7:00 PM"
    const regularMatch = availRaw.match(/regular[^\d]*(\d{1,2}:\d{2}\s*[ap]m)\s*-\s*(\d{1,2}:\d{2}\s*[ap]m)/i);
    if (regularMatch) {
      const s = parseTime(regularMatch[1]);
      const e = parseTime(regularMatch[2]);
      if (s && e) { start = s; end = e; }
    }
    if (dow === 0) { // Sunday special hours if mentioned
      const sunMatch = availRaw.match(/sun(day)?[^\d]*(\d{1,2}:\d{2}\s*[ap]m)\s*-\s*(\d{1,2}:\d{2}\s*[ap]m)/i);
      if (sunMatch) {
        const s = parseTime(sunMatch[2]);
        const e = parseTime(sunMatch[3]);
        if (s && e) { start = s; end = e; }
      }
    }
    const startMin = minutesFromHHMM(start);
    const endMin = minutesFromHHMM(end);
    const times = [];
    for (let t = startMin; t < endMin; t += step) times.push(toHHMM(t));
    return times;
  }

  const slots = useMemo(() => computeSlotsForDate(date), [date, activeItem]);

  // Stable service key used for counts and booking
  const serviceKey = useMemo(() => {
    if (!activeItem) return '';
    return String(activeItem.serviceKey || activeItem.SERVICE_ID || activeItem.SERVICE_PACKGE_ID || activeItem.id || '').trim();
  }, [activeItem]);

  const [slotCounts, setSlotCounts] = useState({}); // day view counts
  useEffect(() => {
    const serviceId = serviceKey;
    if (!serviceId || !date) return;
    const countsRef = ref(usersDB, `appointmentSlotCounts/${serviceId}/${date}`);
    const unsub = onValue(countsRef, (snap) => {
      setSlotCounts(snap.exists() ? (snap.val() || {}) : {});
    }, () => setSlotCounts({}));
    return () => { try { unsub && unsub(); } catch(_) {} };
  }, [serviceKey, date]);

  // Full-day list for Day view (since morning/evening tabs were removed)
  const daySlotsDisplayed = useMemo(() => slots, [slots]);
  // Retain filtered list for internal use (e.g., week helpers that still derive morning sets)
  const filteredByTimeOfDay = useMemo(() => {
    if (!slots.length) return [];
    return slots.filter((hhmm) => {
      const mins = minutesFromHHMM(hhmm);
      if (timeOfDay === 'Morning') return mins < minutesFromHHMM('12:00');
      return mins >= minutesFromHHMM('12:00');
    });
  }, [slots, timeOfDay]);

  // Week view helpers
  const weekDates = useMemo(() => {
    const base = date ? new Date(date + 'T00:00:00') : new Date();
    const day = base.getDay();
    const sunday = new Date(base);
    sunday.setDate(base.getDate() - day);
    const arr = [];
    for (let i=0;i<7;i++) { const d = new Date(sunday); d.setDate(sunday.getDate()+i); arr.push(toLocalDateStringYYYYMMDD(d)); }
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
    // Fallback hour ruler so users always see time labels
    const fallbackStart = timeOfDay === 'Morning' ? '07:00' : '12:00';
    const fallbackEnd   = timeOfDay === 'Morning' ? '12:00' : '19:00';
    const startM = minutesFromHHMM(fallbackStart);
    const endM = minutesFromHHMM(fallbackEnd);
    const tmp = [];
    for (let t = startM; t < endM; t += 30) tmp.push(toHHMM(t));
    return tmp;
  }, [weekDates, weekDaySlots, timeOfDay]);

  const [slotCountsByDate, setSlotCountsByDate] = useState({});
  useEffect(() => {
    if (viewMode !== 'week') return;
    const serviceId = serviceKey;
    if (!serviceId) return;
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
  }, [viewMode, serviceKey, JSON.stringify(weekDates)]);

  // Auto-scroll to selected or first available slot when date/time period changes (modal grid)
  useEffect(() => {
    const list = viewMode === 'day' ? daySlotsDisplayed : filteredByTimeOfDay;
    if (!scheduleOpen || !date || !list.length) return;
    const cap = Number(activeItem?.capacity ?? activeItem?.SLOT ?? 1) || 1;
    const firstAvailable = list.find(h => (Number(slotCounts?.[h] || 0) || 0) < cap);
    const target = (time && list.includes(time)) ? time : (firstAvailable || list[0]);
    if (!target) return;
    const wrap = slotsWrapRef.current;
    if (!wrap) return;
    const el = wrap.querySelector(`[data-time="${target}"]`);
    if (el && typeof el.scrollIntoView === 'function') {
      el.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }, [scheduleOpen, date, viewMode, daySlotsDisplayed.length, timeOfDay, serviceKey, JSON.stringify(slotCounts)]);

  const [nowMins, setNowMins] = useState(() => { const n = new Date(); return n.getHours()*60 + n.getMinutes(); });
  useEffect(() => {
    const todayStr = toLocalDateStringYYYYMMDD(new Date());
    if (date !== todayStr) return;
    const id = setInterval(() => { const n = new Date(); setNowMins(n.getHours()*60 + n.getMinutes()); }, 60000);
    return () => clearInterval(id);
  }, [date]);
  const showNowLine = useMemo(() => toLocalDateStringYYYYMMDD(new Date()) === date, [date]);

  // Horizontal day scroller (today -> next 60 days)
  const dateScrollerDays = useMemo(() => {
    const out = [];
    const start = new Date();
    start.setHours(0,0,0,0);
    for (let i = 0; i < 60; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      out.push({ str: toLocalDateStringYYYYMMDD(d), d });
    }
    return out;
  }, []);

  const dateScrollerRef = useRef(null);
  const dateChipRefs = useRef(new Map());
  const programmaticScrollRef = useRef(false);
  useEffect(() => {
    const wrap = dateScrollerRef.current;
    if (!wrap || !date) return;
    const el = wrap.querySelector(`[data-date="${date}"]`);
    if (el) {
      // Center the active chip
      const center = () => {
        try {
          const wrapRect = wrap.getBoundingClientRect();
          const elRect = el.getBoundingClientRect();
          const wrapCenter = (wrapRect.left + wrapRect.right) / 2;
          const elCenter = (elRect.left + elRect.right) / 2;
          const delta = elCenter - wrapCenter;
          if (Math.abs(delta) > 2) {
            programmaticScrollRef.current = true;
            wrap.scrollTo({ left: wrap.scrollLeft + delta, behavior: 'smooth' });
            // Clear the flag shortly after
            setTimeout(() => { programmaticScrollRef.current = false; }, 300);
          }
        } catch (_) {
          if (typeof el.scrollIntoView === 'function') el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
        }
      };
      center();
    }
  }, [date, scheduleOpen]);

  // Make mouse wheel scroll horizontal and auto-select the center chip when scrolling
  useEffect(() => {
    const wrap = dateScrollerRef.current;
    if (!wrap) return;
    let scrollSelectTimer = null;
    const onWheel = (e) => {
      try {
        // Convert vertical wheel to horizontal scrolling
        if (Math.abs(e.deltaY) > Math.abs(e.deltaX)) {
          e.preventDefault();
          wrap.scrollLeft += e.deltaY;
        }
      } catch (_) {}
      // Debounce selection of the center chip
      if (scrollSelectTimer) clearTimeout(scrollSelectTimer);
      scrollSelectTimer = setTimeout(() => {
        if (programmaticScrollRef.current) return; // ignore programmatic centering
        try {
          const wrapRect = wrap.getBoundingClientRect();
          const wrapCenter = (wrapRect.left + wrapRect.right) / 2;
          const chips = Array.from(wrap.querySelectorAll('button[data-date]'));
          let best = null;
          let bestDist = Infinity;
          chips.forEach((btn) => {
            if (btn.classList.contains(styles.dateChipDisabled)) return; // skip disabled (today/past)
            const r = btn.getBoundingClientRect();
            const c = (r.left + r.right) / 2;
            const dist = Math.abs(c - wrapCenter);
            if (dist < bestDist) { bestDist = dist; best = btn; }
          });
          if (best) {
            const nextDate = best.getAttribute('data-date');
            if (nextDate && nextDate !== date) {
              setDate(nextDate);
              setTime('');
            }
          }
        } catch (_) {}
      }, 120);
    };
    const onScroll = () => {
      // When user scrolls with trackpad or scrollbar, also debounce select center
      if (programmaticScrollRef.current) return;
      if (scrollSelectTimer) clearTimeout(scrollSelectTimer);
      scrollSelectTimer = setTimeout(() => {
        try {
          const wrapRect = wrap.getBoundingClientRect();
          const wrapCenter = (wrapRect.left + wrapRect.right) / 2;
          const chips = Array.from(wrap.querySelectorAll('button[data-date]'));
          let best = null; let bestDist = Infinity;
          chips.forEach((btn) => {
            if (btn.classList.contains(styles.dateChipDisabled)) return;
            const r = btn.getBoundingClientRect();
            const c = (r.left + r.right) / 2;
            const dist = Math.abs(c - wrapCenter);
            if (dist < bestDist) { bestDist = dist; best = btn; }
          });
          if (best) {
            const nextDate = best.getAttribute('data-date');
            if (nextDate && nextDate !== date) {
              setDate(nextDate);
              setTime('');
            }
          }
        } catch (_) {}
      }, 140);
    };
    try { wrap.addEventListener('wheel', onWheel, { passive: false }); } catch(_) { wrap.addEventListener('wheel', onWheel); }
    wrap.addEventListener('scroll', onScroll);
    return () => {
      try { wrap.removeEventListener('wheel', onWheel); } catch(_) {}
      try { wrap.removeEventListener('scroll', onScroll); } catch(_) {}
      if (scrollSelectTimer) clearTimeout(scrollSelectTimer);
    };
  }, [date]);

  // Catalog browsing helpers
  const [browseTab, setBrowseTab] = useState('all');
  const [search, setSearch] = useState('');
  const catalog = useMemo(() => {
    let list = browseTab === 'packages' ? packagesCatalog : (browseTab === 'services' ? servicesCatalog : [...servicesCatalog, ...packagesCatalog]);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(it => it.title.toLowerCase().includes(q) || (it.summary||'').toLowerCase().includes(q));
    }
    return [...list];
  }, [browseTab, search, packagesCatalog, servicesCatalog]);

  const selectFromCatalog = (title) => {
    const all = [...servicesCatalog, ...packagesCatalog];
    const found = all.find(x => x.title === title);
    if (found) { setActiveItem(found); setTime(""); }
  };

  // Open fullscreen schedule picker: require service, and ensure date defaults
  const openSchedule = () => {
    if (!activeItem) {
      showModal({ type: 'error', title: 'Select a service', message: 'Please choose a service before picking a schedule.' });
      return;
    }
    if (!date) {
      // Default to earliest allowed date so Week view isn’t blank
      setDate(tomorrowStr);
      setTime("");
    }
    // Default period to Morning on open
    setTimeOfDay('Morning');
    setScheduleOpen(true);
    try { document.body.classList.add('modal-no-scroll'); } catch(_) {}
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!activeItem || !date || !time) { showModal({ type:'error', title:'Incomplete details', message:'Please select a service, date, and time.' }); return; }
  if (date < tomorrowStr) { showModal({ type:'error', title:'Date not allowed', message:'Appointments can be booked starting tomorrow and onward.' }); return; }
    if (!patient.birthday) { showModal({ type:'error', title:'Missing birthday', message:'Please enter your birthday.' }); return; }
    const bdayStr = String(patient.birthday);
    if (!(bdayStr <= birthdayMaxStr)) { showModal({ type:'error', title:'Birthday too recent', message:`Birthday must be at least ${minAgeDays} day(s) before today.` }); return; }
    setRulesOpen(true);
  };

  const proceedBooking = async () => {
    if (booking) return;
    setBooking(true);
    try {
      const user = authService.currentUser;
      const record = {
        USER_ID: user?.uid || '',
        FIRST_NAME: patient.firstName || '',
        LAST_NAME: patient.lastName || '',
        PHONE: patient.phone || '',
        EMAIL: (patient.email || user?.email || '').trim(),
        BIRTHDAY: patient.birthday || '',
        GENDER: patient.gender || '',
  SERVICE_ID: serviceKey || '',
        SERVICE_NAME: activeItem.title || '',
        SERVICE_TYPE: activeItem.kind === 'package' ? 'package' : 'service',
        DATE_OF_APPOINTMENT: date,
        TIME_SLOT: time,
        SLOT_CAPACITY_REF: '',
        CHIEF_COMPLAINT: patient.complaint || '',
        SPECIAL_INSTRUCTIONS: patient.notes || '',
        BOOKING_STATUS: 'pending',
      };
      const capacity = Number(activeItem?.capacity ?? activeItem?.SLOT ?? 1) || 1;
      const reserved = await appointmentsService.reserveSlot(record.SERVICE_ID, record.DATE_OF_APPOINTMENT, record.TIME_SLOT, capacity);
      if (!reserved) { showModal({ type:'error', title:'Fully booked', message:'Sorry, this service at the selected date and time is already fully booked. Please choose another time.' }); return; }
      try {
        const created = await appointmentsService.create(record);
        await appointmentsService.indexAppointmentBySlot(record.SERVICE_ID, record.DATE_OF_APPOINTMENT, record.TIME_SLOT, created.id);
        showModal({ type:'success', title:'Appointment submitted', message:"Your appointment request was received and is now pending admin approval. You'll get an email when it's approved." });
      } catch (err) {
        await appointmentsService.releaseSlot(record.SERVICE_ID, record.DATE_OF_APPOINTMENT, record.TIME_SLOT);
        showModal({ type:'error', title:'Submission failed', message:'Failed to submit appointment. Please try again.' });
      }
    } catch (err) {
      showModal({ type:'error', title:'Reservation failed', message:'Failed to reserve the selected time. Please try again.' });
    } finally {
      setRulesOpen(false);
      setBooking(false);
    }
  };

  return (
    <div className={styles.wrapper}>
      <aside className={styles.infoCard}>
        <h3 className={styles.infoTitle}>Service Center</h3>
        <div className={styles.infoBody}>
          <div className={styles.label}>Service</div>
          <div className={styles.selectedService}>{activeItem?.title || 'Select a service below'}</div>
          {activeItem?.availability && (<div className={styles.smallNote}><b>Hours:</b> {activeItem.availability}</div>)}
        </div>

        <div className={styles.catalog}>
          <div className={styles.catalogHeader}>Browse Services</div>
          <div className={styles.catalogControls}>
            <div className={styles.catalogTabs}> 
              {['all','packages','services'].map(t => (
                <button key={t} type="button" className={`${styles.ctab} ${browseTab===t?styles.ctabActive:''}`} onClick={()=>setBrowseTab(t)}>
                  {t[0].toUpperCase()+t.slice(1)}
                </button>
              ))}
            </div>
            <input className={styles.catalogSearch} placeholder="Search..." value={search} onChange={(e)=>setSearch(e.target.value)} />
          </div>
          <div className={styles.catalogList}>
            {catalog.map((it) => (
              <button key={it.title} type="button" className={styles.catalogItem} onClick={()=>selectFromCatalog(it.title)}>
                <div className={styles.catalogTitle}>{it.title}</div>
                {it.summary && <div className={styles.catalogSummary}>{it.summary}</div>}
              </button>
            ))}
          </div>
          <div className={styles.smallNote}>Tip: Click an item to select and prefill the service above.</div>
        </div>
      </aside>

      <section className={styles.mainCard}>
        <div className={styles.scheduleBlock}>
          <h3>Choose Your Schedule</h3>
          {/* Inline header removed; controls are only inside the fullscreen modal */}

          {/* Compact summary + open button instead of inline grid to avoid crammed layout */}
          <div className={styles.inlineScheduleSummary}>
            <div className={styles.inlineSummaryRow}>
              <div>
                <div className={styles.smallNote}>Selected date</div>
                <div><strong>{date || '—'}</strong></div>
              </div>
              <div>
                <div className={styles.smallNote}>Selected time</div>
                <div><strong>{time ? labelFromHHMM(time) : '—'}</strong></div>
              </div>
              <div style={{ marginLeft: 'auto' }}>
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={openSchedule}
                  disabled={!activeItem}
                  title={activeItem ? 'Open the full calendar' : 'Select a service to open the calendar'}
                >
                  Open Full‑Screen Picker
                </button>
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={onSubmit} className={styles.form}>
          <h3>Your Booking Details</h3>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}><label className={styles.label}>First Name</label><input className={styles.input} value={patient.firstName} onChange={(e)=>setPatient(p=>({...p,firstName:e.target.value}))} required /></div>
            <div className={styles.formGroup}><label className={styles.label}>Last Name</label><input className={styles.input} value={patient.lastName} onChange={(e)=>setPatient(p=>({...p,lastName:e.target.value}))} required /></div>
            <div className={styles.formGroup}><label className={styles.label}>Phone</label><input className={styles.input} type="tel" value={patient.phone} onChange={(e)=>setPatient(p=>({...p,phone:e.target.value}))} /></div>
            <div className={styles.formGroup}><label className={styles.label}>Email</label><input className={styles.input} type="email" value={patient.email} onChange={(e)=>setPatient(p=>({...p,email:e.target.value}))} /></div>
            <div className={styles.formGroup}>
              <label className={styles.label}>Birthday</label>
              <input
                className={styles.input}
                type="date"
                value={patient.birthday}
                onChange={(e)=>setPatient(p=>({...p,birthday:e.target.value}))}
                max={birthdayMaxStr}
                required
              />
              <div className={styles.smallNote}>Must be at least {minAgeDays} day(s) old.</div>
            </div>
            <div className={styles.formGroup}><label className={styles.label}>Gender</label><select className={styles.input} value={patient.gender} onChange={(e)=>setPatient(p=>({...p,gender:e.target.value}))} required><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select></div>
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label className={styles.label}>Chief Complaint</label>
              <textarea
                ref={complaintRef}
                className={`${styles.textarea} ${styles.textareaLg}`}
                rows="2"
                placeholder="Briefly describe your main concern, location, and duration (e.g., Dog bite left calf today; washed wound)."
                value={patient.complaint}
                onChange={(e)=>setPatient(p=>({...p,complaint:e.target.value}))}
              />
              <div className={styles.smallNote}>Provide your main complaint in a sentence or two.</div>
            </div>
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label className={styles.label}>Special Instructions</label>
              <textarea
                ref={notesRef}
                className={`${styles.textarea} ${styles.textareaXL}`}
                rows="3"
                placeholder="Allergies, preparation notes, preferences or access needs (e.g., allergic to penicillin; please call before arrival)."
                value={patient.notes}
                onChange={(e)=>setPatient(p=>({...p,notes:e.target.value}))}
              />
              <div className={styles.smallNote}>Optional notes to help our staff prepare.</div>
            </div>
          </div>
          <div className={styles.actions}>
            <button type="submit" className={styles.primaryBtn} disabled={!date || !time}>
              Book Now
            </button>
          </div>
        </form>
      </section>

      <aside className={styles.summaryCard}>
        <h3>Your Appointment Details</h3>
        <div className={styles.summaryRow}><span>Service</span><strong>{activeItem?.title || '-'}</strong></div>
        <div className={styles.summaryRow}><span>Type</span><strong>{activeItem ? (activeItem.kind === 'package' ? 'Package' : 'Service') : '-'}</strong></div>
        <div className={styles.summaryRow}><span>Price</span><strong>{activeItem ? (activeItem.price ? `₱${Number(activeItem.price).toLocaleString()}` : 'Varies') : '-'}</strong></div>
        <div className={styles.summaryRow}><span>Date</span><strong>{date || '-'}</strong></div>
        <div className={styles.summaryRow}><span>Time</span><strong>{time ? labelFromHHMM(time) : '-'}</strong></div>
        <div className={styles.summaryRow}><span>Patient</span><strong>{(patient.firstName || patient.lastName) ? `${patient.firstName} ${patient.lastName}`.trim() : '-'}</strong></div>
        <div className={styles.summaryRow}><span>Phone</span><strong>{patient.phone || '-'}</strong></div>
        <div className={styles.summaryRow}><span>Email</span><strong>{patient.email || '-'}</strong></div>
        <div className={styles.summaryRow}><span>Gender</span><strong>{patient.gender || '-'}</strong></div>
        <div className={styles.summaryRow}><span>Birthday</span><strong>{patient.birthday || '-'}</strong></div>
        <div className={styles.summaryRow}><span>Chief Complaint</span><strong>{patient.complaint || '-'}</strong></div>
        <div className={styles.summaryRow}><span>Special Instructions</span><strong>{patient.notes || '-'}</strong></div>
        <div className={styles.summaryNote}>Arrive 10 minutes early. Follow preparation instructions where applicable.</div>
      </aside>

      {modal.open && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="bookModalTitle"
          onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
        >
          <div className={styles.modalCard}>
            <div className={styles.modalTop}>
              <div
                className={styles.modalIconWrap}
                style={modal.type === 'success' ? { background: '#ecfdf5', color: '#065f46' } : undefined}
                aria-hidden
              >
                {modal.type === 'success' ? '✓' : '!'}
              </div>
              <div>
                <div id="bookModalTitle" className={styles.modalTitle}>{modal.title || 'Notice'}</div>
                {modal.message && <div className={styles.modalSubtitle}>{modal.message}</div>}
              </div>
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.ghostBtn} onClick={closeModal}>Close</button>
            </div>
          </div>
        </div>
      )}

      {rulesOpen && (
        <div
          className={styles.modalOverlay}
          role="dialog"
          aria-modal="true"
          aria-labelledby="rulesModalTitle"
          onClick={(e) => { if (e.target === e.currentTarget && !booking) setRulesOpen(false); }}
        >
          <div className={`${styles.modalCard} ${styles.modalWide}`}>
            <div className={styles.modalTop}>
              <div className={`${styles.modalIconWrap} ${styles.modalIconInfo}`} aria-hidden>ℹ</div>
              <div>
                <div id="rulesModalTitle" className={styles.modalTitle}>Please review before booking</div>
                <div className={styles.modalSubtitle}>By proceeding, you confirm you have read and accept these rules.</div>
              </div>
            </div>
            <div className={styles.modalBody} style={{ maxHeight: 360, overflow: 'auto' }}>
              <div className={styles.modalRuleSection}>
                <div className={styles.modalRuleTitle}>Service Priority Order</div>
                <div className={styles.modalRuleSubtitle}>If a walk‑in and a scheduled patient arrive at the same time, we serve patients in this order:</div>
                <ol className={styles.modalRuleList}>
                  <li><strong>Medical urgency</strong> — based on the patient’s current condition.</li>
                  <li><strong>First in queue</strong> — the walk‑in who arrived earlier.</li>
                  <li><strong>Scheduled time</strong> — patients with appointments at their booked time.</li>
                </ol>
              </div>
              <div className={styles.modalRuleSection}>
                <div className={styles.modalRuleTitle}>Important Appointment Policy</div>
                <div className={styles.modalRuleSubtitle}>
                  Cancellation or rescheduling of appointments multiple times may result in a temporary restriction:
                  a <strong>3‑day block</strong> from booking new appointments. Please only book when you are reasonably sure you can attend.
                </div>
              </div>
            </div>
            <div className={styles.modalActions}>
              <button type="button" className={styles.ghostBtn} onClick={() => setRulesOpen(false)} disabled={booking}>Cancel</button>
              <button type="button" className={styles.primaryBtn} onClick={proceedBooking} disabled={booking}>
                {booking ? 'Submitting…' : 'I Accept & Book'}
              </button>
            </div>
          </div>
        </div>
      )}

      {scheduleOpen && (
        <div className={`${styles.modalOverlay} ${styles.modalOverlayTop}`} role="dialog" aria-modal="true" aria-labelledby="scheduleFsTitle" onClick={(e)=>{ if (e.target===e.currentTarget) setScheduleOpen(false); }}>
          <div className={`${styles.modalCard} ${styles.modalFullscreen}`}>
            <div className={styles.modalFsTop}>
              <div className={styles.calHeaderLeft}>
                <button
                  type="button"
                  className={styles.calNavBtn}
                  onClick={() => {
                    if (!date) { setDate(tomorrowStr); setTime(""); return; }
                    const d = new Date(date + 'T00:00:00');
                    d.setDate(d.getDate() - 7);
                    const prev = toLocalDateStringYYYYMMDD(d);
                    setDate(prev);
                    setTime("");
                  }}
                  aria-label={'Previous week'}
                >◀</button>
                <button
                  type="button"
                  className={styles.calNavBtn}
                  onClick={() => {
                    const base = date ? new Date(date + 'T00:00:00') : new Date();
                    base.setDate(base.getDate() + 7);
                    const next = toLocalDateStringYYYYMMDD(base);
                    setDate(next);
                    setTime("");
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
                    <button key={v} type="button" className={`${styles.tab} ${viewMode===v?styles.activeTab:''}`} onClick={()=>setViewMode(v)}>
                      {v[0].toUpperCase()+v.slice(1)}
                    </button>
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
                  <button
                    type="button"
                    className={`${styles.primaryBtn} ${styles.primaryBtnSm}`}
                    onClick={() => {
                      // Confirm the current date/time selection and close the calendar
                      setScheduleOpen(false);
                    }}
                    title="Confirm this selection"
                  >
                    Confirm
                  </button>
                )}
                <button type="button" className={styles.ghostBtn} onClick={()=>setScheduleOpen(false)}>Close</button>
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
                  const isBeforeAllowed = str < tomorrowStr; // disable today and past
                  return (
                    <button
                      key={str}
                      role="tab"
                      aria-selected={isActive}
                      className={`${styles.dateChip} ${isActive ? styles.dateChipActive : ''} ${isBeforeAllowed ? styles.dateChipDisabled : ''}`}
                      ref={(el) => { if (el) dateChipRefs.current.set(str, el); else dateChipRefs.current.delete(str); }}
                      onClick={(e) => {
                        if (isBeforeAllowed) return;
                        setDate(str); setTime('');
                        // Center on click immediately for better feedback
                        const wrap = dateScrollerRef.current;
                        const el = e.currentTarget;
                        if (wrap && el) {
                          try {
                            const wrapRect = wrap.getBoundingClientRect();
                            const elRect = el.getBoundingClientRect();
                            const wrapCenter = (wrapRect.left + wrapRect.right) / 2;
                            const elCenter = (elRect.left + elRect.right) / 2;
                            const delta = elCenter - wrapCenter;
                            if (Math.abs(delta) > 2) {
                              programmaticScrollRef.current = true;
                              wrap.scrollTo({ left: wrap.scrollLeft + delta, behavior: 'smooth' });
                              setTimeout(() => { programmaticScrollRef.current = false; }, 300);
                            }
                          } catch (_) {
                            if (typeof el.scrollIntoView === 'function') el.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
                          }
                        }
                      }}
                      title={`${weekday}, ${month} ${day}`}
                      data-date={str}
                    >
                      <span className={styles.dateChipDow}>{weekday}</span>
                      <span className={styles.dateChipDay}>{day}</span>
                      <span className={styles.dateChipMon}>{month}</span>
                    </button>
                  );
                })}
              </div>
              {!date ? (
                <div className={styles.empty}>Select a date to see available times.</div>
              ) : (
                viewMode === 'day' ? (
                  daySlotsDisplayed.length === 0 ? (
                    <div className={styles.empty}>No available slots for the selected date/time of day.</div>
                  ) : (
                    <>
                    <div className={styles.dayGrid} ref={slotsWrapRef}>
                      <div className={styles.timeCol} aria-hidden>
                        {daySlotsDisplayed.map(hhmm => (
                          <div key={hhmm} className={styles.timeCell}>
                            <span className={styles.timeLabel}>{hourLabelFromHHMM(hhmm)}</span>
                          </div>
                        ))}
                      </div>
                      <div className={styles.gridCol} role="grid" aria-label="Available time slots">
                        {showNowLine && daySlotsDisplayed.length > 0 && (() => {
                          const first = daySlotsDisplayed[0];
                          const last = daySlotsDisplayed[daySlotsDisplayed.length - 1];
                          const firstM = minutesFromHHMM(first);
                          const lastM = minutesFromHHMM(last) + 30;
                          const clamped = Math.max(firstM, Math.min(nowMins, lastM));
                          const total = lastM - firstM;
                          const pct = total > 0 ? ((clamped - firstM) / total) * 100 : 0;
                          return (<><div className={styles.nowLine} style={{ top: `calc(${pct}% - 1px)` }} aria-hidden /><div className={styles.nowDot} style={{ top: `calc(${pct}% - 4px)` }} aria-hidden /></>);
                        })()}
                        {daySlotsDisplayed.map(hhmm => {
                          const count = Number(slotCounts?.[hhmm] || 0) || 0;
                          const cap = Number(activeItem?.capacity ?? activeItem?.SLOT ?? 1) || 1;
                          const full = count >= cap;
                          const selected = time === hhmm;
                          return (
                            <button key={hhmm} type="button" role="gridcell" className={`${styles.slotCell} ${selected?styles.slotCellSelected:''} ${full?styles.slotCellFull:''}`} data-time={hhmm} onClick={() => { if (!full) setTime(hhmm); }} aria-selected={selected} aria-disabled={full} title={`${labelFromHHMM(hhmm)} — ${count}/${cap}`}>
                              <div className={styles.cellContent}><div className={styles.cellPrimary}>{labelFromHHMM(hhmm)}</div><div className={styles.cellSecondary}>{count}/{cap}</div></div>
                              {full && <span className={styles.slotBadge}>Full</span>}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className={styles.scrollEndPad} aria-hidden />
                    </>
                  )
                ) : (
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
                          <div key={h} className={styles.weekTimeCell}>
                            {hourLabelFromHHMM(h)}
                          </div>
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
                                    const cap = Number(activeItem?.capacity ?? activeItem?.SLOT ?? 1) || 1;
                                    const full = !isPlaceholder && count >= cap;
                                    const selected = !isPlaceholder && isAllowedDate && (date === dStr) && (time === hhmm);
                              return (
                                <button
                                  key={hhmm}
                                  type="button"
                                  role="gridcell"
                                        className={`${styles.slotCell} ${selected?styles.slotCellSelected:''} ${full?styles.slotCellFull:''}`}
                                        onClick={() => { if (!isAllowedDate) return; setDate(dStr); if (!isPlaceholder && !full) setTime(hhmm); }}
                                        title={!isAllowedDate ? `Booking starts tomorrow` : (isPlaceholder ? labelFromHHMM(hhmm) : `${labelFromHHMM(hhmm)} — ${count}/${cap}`)}
                                        aria-selected={selected}
                                        aria-disabled={!isAllowedDate || isPlaceholder || full}
                                >
                                  <div className={styles.cellContent}>
                                    <div className={styles.cellPrimary}>{labelFromHHMM(hhmm)}</div>
                                          <div className={styles.cellSecondary}>{isPlaceholder ? '—' : `${count}/${cap}`}</div>
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
                    <div className={styles.periodLabel}>Evening</div>
                    {(() => {
                      // Derive evening-specific arrays without altering primary state
                      const eveningWeekDaySlots = (() => {
                        const obj = {};
                        weekDates.forEach(dStr => {
                          const daySlots = computeSlotsForDate(dStr).filter(h => minutesFromHHMM(h) >= minutesFromHHMM('12:00'));
                          obj[dStr] = daySlots;
                        });
                        return obj;
                      })();
                      const eveningRowTimes = (() => {
                        const set = new Set();
                        weekDates.forEach(dStr => (eveningWeekDaySlots[dStr]||[]).forEach(t => set.add(t)));
                        const arr = Array.from(set).sort((a,b)=>minutesFromHHMM(a)-minutesFromHHMM(b));
                        if (arr.length > 0) return arr;
                        const startM = minutesFromHHMM('12:00');
                        const endM = minutesFromHHMM('19:00');
                        const tmp = []; for (let t=startM;t<endM;t+=30) tmp.push(toHHMM(t)); return tmp;
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
                                    const isAllowedDate = dStr >= tomorrowStr; // allow tomorrow and onwards
                                    const isPlaceholder = !(eveningWeekDaySlots[dStr] || []).includes(hhmm);
                                    const count = isPlaceholder ? null : (Number(counts?.[hhmm] || 0) || 0);
                                    const cap = Number(activeItem?.capacity ?? activeItem?.SLOT ?? 1) || 1;
                                    const full = !isPlaceholder && count >= cap;
                                    const selected = !isPlaceholder && isAllowedDate && (date === dStr) && (time === hhmm);
                                    return (
                                      <button key={hhmm} type="button" role="gridcell" className={`${styles.slotCell} ${selected?styles.slotCellSelected:''} ${full?styles.slotCellFull:''}`} onClick={() => { if (!isAllowedDate) return; setDate(dStr); if (!isPlaceholder && !full) setTime(hhmm); }} title={!isAllowedDate ? `Booking starts tomorrow` : (isPlaceholder ? labelFromHHMM(hhmm) : `${labelFromHHMM(hhmm)} — ${count}/${cap}`)} aria-selected={selected} aria-disabled={!isAllowedDate || isPlaceholder || full}>
                                        <div className={styles.cellContent}>
                                          <div className={styles.cellPrimary}>{labelFromHHMM(hhmm)}</div>
                                          <div className={styles.cellSecondary}>{isPlaceholder ? '—' : `${count}/${cap}`}</div>
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
                )
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


