import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import styles from "./BookAppointment.module.css";
import appointmentsService from "/src/services/AppointmentsService";
import authService from "/src/services/AuthService";
import servicePackagesService from "/src/services/ServicePackagesService";
import { get, ref } from "firebase/database";
import { usersDB } from "/src/config/firebase-config";
import singleServicesService from "/src/services/SingleServicesService";

function pad(n) { return n.toString().padStart(2, "0"); }
function minutesFromHHMM(hhmm) { const [h,m] = hhmm.split(":").map(Number); return h*60 + m; }
function toHHMM(mins) { const h = Math.floor(mins/60), m = mins%60; return `${pad(h)}:${pad(m)}`; }
function labelFromHHMM(hhmm) { const [h,m]=hhmm.split(":").map(Number); const ampm=h>=12?"PM":"AM"; const h12=h%12===0?12:h%12; return `${h12}:${pad(m)} ${ampm}`; }

// Format a Date (local timezone) as YYYY-MM-DD for <input type="date">
function toLocalDateStringYYYYMMDD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function BookAppointment() {
  const location = useLocation();
  // Selected item from catalog (either package or single)
  const [activeItem, setActiveItem] = useState(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("Morning");
  const [patient, setPatient] = useState({ firstName: "", lastName: "", phone: "", email: "", birthday: "", gender: "", complaint: "", notes: "" });

  // Auto-resize textareas based on content
  const complaintRef = useRef(null);
  const notesRef = useRef(null);
  useEffect(() => {
    const auto = (el) => { if (!el) return; el.style.height = "auto"; el.style.height = `${el.scrollHeight}px`; };
    auto(complaintRef.current);
    auto(notesRef.current);
  }, [patient.complaint, patient.notes]);

  // Data from DB
  const [packagesCatalog, setPackagesCatalog] = useState([]);
  const [servicesCatalog, setServicesCatalog] = useState([]);

  // Auto-fill patient fields from current user's profile if available
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
      } catch (e) {
        setPatient((p) => ({ ...p, email: p.email || authService.currentUser?.email || '' }));
      }
    })();
  }, []);

  // Tomorrow (local) as the earliest allowed booking date
  const tomorrowStr = useMemo(() => {
    const t = new Date();
    t.setDate(t.getDate() + 1);
    return toLocalDateStringYYYYMMDD(t);
  }, []);

  // Clamp existing date state if it becomes earlier than tomorrow (e.g., after a reload/timezone change)
  useEffect(() => {
    if (date && date < tomorrowStr) {
      setDate(tomorrowStr);
      setTime("");
    }
  }, [tomorrowStr]);

  // Load services/packages from Firebase (similar to Admin Services page)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [bundles, singles] = await Promise.all([
          servicePackagesService.list(),
          singleServicesService.list(),
        ]);
        if (cancelled) return;
        const REGULAR = 'Regular Schedule : Mon-Sat 7:00 AM - 4:00 PM (3:30 PM cutoff). Sunday 7:30 AM - 11:30 AM.';

        const mappedPackages = (bundles || [])
          .filter((db) => (db?.IS_ACTIVE_YesNo ?? 'Yes') === 'Yes')
          .map((db) => {
            const original = db.ORIGINAL_PRICE ?? db.ORIGINAL_RPICE;
            const discounted = db.DISCOUNTED_PRICE;
            const phil = db.PHIL_HEALTH_PROMO_PRICE;
            const price = discounted ?? original ?? phil ?? 0;
            return {
              kind: 'package',
              id: db.SERVICE_PACKGE_ID || db.id,
              title: db.NAME || '',
              summary: db.DESC || '',
              availability: (db.AVAILABILITY === 'REGULAR') ? REGULAR : (db.AVAILABILITY || ''),
              price: Number(price) || 0,
              capacity: Number(db.SLOT || 1) || 1,
            };
          });

        const mappedSingles = (singles || [])
          .filter((db) => (db?.IS_ACTIVE_YesNo ?? db['IS_ACTIVE(Yes/No)'] ?? 'Yes') === 'Yes')
          .map((db) => {
            const original = db.ORIGINAL_PRICE ?? db['ORIGINAL PRICE'];
            const discounted = db.DISCOUNTED_PRICE ?? db['DISCOUNTED PRICE'] ?? db.DICOUNTED_PRICE ?? db['DICOUNTED PRICE'];
            const phil = db.PHIL_HEALTH_PROMO_PRICE ?? db.PHILHEALTH_PROMO_PRICE ?? db['PHILHEALTH PROMO PRICE'];
            const price = discounted ?? original ?? phil ?? 0;
            const availability = db.AVAILABILITY || '';
            return {
              kind: 'service',
              id: db.SERVICE_ID || db['Service_ID'] || db.id,
              title: db.NAME || '',
              summary: db.DESC || '',
              availability: availability === 'REGULAR' ? REGULAR : availability,
              price: Number(price) || 0,
              pinned: /free anti\-rabies|anti\-rabies/i.test(db.NAME || ''),
              capacity: Number(db.SLOT || 1) || 1,
            };
          });

        // Sort pinned first in services
        mappedSingles.sort((a,b) => (b.pinned?1:0) - (a.pinned?1:0));
        setPackagesCatalog(mappedPackages);
        setServicesCatalog(mappedSingles);
        // If nothing selected, pick the first service to show content
        if (!activeItem && (mappedSingles[0] || mappedPackages[0])) {
          setActiveItem(mappedSingles[0] || mappedPackages[0]);
        }
      } catch {
        // ignore
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const formatRange = (start, end) => {
    if (!start || !end) return '';
    const toLabel = (hhmm) => {
      const [h,m] = hhmm.split(":").map(Number);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 === 0 ? 12 : h % 12;
      const mm = m.toString().padStart(2,'0');
      return `${h12}:${mm} ${ampm}`;
    };
    return `${toLabel(start)} - ${toLabel(end)}`;
  };

  const slots = useMemo(() => {
    if (!date) return [];
    const d = new Date(date + "T00:00:00");
    const dow = d.getDay();
    // Default to Regular schedule windows if availability matches REGULAR string; otherwise a generic 09:00-16:00
    const REGULAR_SCHEDULE = 'Regular Schedule : Mon-Sat 7:00 AM - 4:00 PM (3:30 PM cutoff). Sunday 7:30 AM - 11:30 AM.';
    const isRegular = (activeItem?.availability || '') === REGULAR_SCHEDULE;
    let start = '09:00', end = '16:00', cutoff = null;
    if (isRegular) {
      if (dow === 0) { start = '07:30'; end = '11:30'; }
      else { start = '07:00'; end = '16:00'; cutoff = '15:30'; }
    }
    const startMin = minutesFromHHMM(start);
    const endMin = minutesFromHHMM(end);
    const lastMin = cutoff ? minutesFromHHMM(cutoff) : endMin;
    const step = 30; const times = [];
    for (let t=startMin;t<=lastMin;t+=step) times.push(toHHMM(t));
    return times;
  }, [date, activeItem]);

  const filteredByTimeOfDay = useMemo(() => {
    if (!slots.length) return [];
    return slots.filter((hhmm) => {
      const mins = minutesFromHHMM(hhmm);
      if (timeOfDay === 'Morning') return mins < minutesFromHHMM('12:00');
      if (timeOfDay === 'Noon') return mins >= minutesFromHHMM('12:00') && mins < minutesFromHHMM('17:00');
      return mins >= minutesFromHHMM('17:00');
    });
  }, [slots, timeOfDay]);

  // Initialize from Services page selection (prefill selection by matching title)
  useEffect(() => {
    const item = location.state && location.state.selectedItem;
    if (!item) return;
    const title = (item.title || '').toLowerCase();
    const all = [...servicesCatalog, ...packagesCatalog];
    const found = all.find(x => (x.title || '').toLowerCase() === title);
    if (found) setActiveItem(found);
  }, [location.state]);

  // Catalog state and helpers
  const [browseTab, setBrowseTab] = useState('all');
  const [search, setSearch] = useState('');
  const catalog = useMemo(() => {
    let list = browseTab === 'packages' ? packagesCatalog : (browseTab === 'services' ? servicesCatalog : [...servicesCatalog, ...packagesCatalog]);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(it => it.title.toLowerCase().includes(q) || (it.summary||'').toLowerCase().includes(q));
    }
    // pinned first
    return [...list].sort((a,b) => (b?.pinned?1:0) - (a?.pinned?1:0));
  }, [browseTab, search, packagesCatalog, servicesCatalog]);

  const selectFromCatalog = (title) => {
    const all = [...servicesCatalog, ...packagesCatalog];
    const found = all.find(x => x.title === title);
    if (found) {
      setActiveItem(found);
      setTime("");
    }
  };

  const onSubmit = (e) => {
    e.preventDefault();
    if (!activeItem || !date || !time) {
      alert('Please select a service, date, and time.');
      return;
    }

    // Build appointment record following the CSV schema
    const user = authService.currentUser;
    const record = {
      USER_ID: user?.uid || '',
      FIRST_NAME: patient.firstName || '',
      LAST_NAME: patient.lastName || '',
      PHONE: patient.phone || '',
      EMAIL: (patient.email || user?.email || '').trim(),
      BIRTHDAY: patient.birthday || '',
      GENDER: patient.gender || '',
      SERVICE_ID: activeItem.id || '',
      SERVICE_TYPE: activeItem.kind === 'package' ? 'package' : 'service',
      DATE_OF_APPOINTMENT: date,
      TIME_SLOT: time,
      SLOT_CAPACITY_REF: '',
      CHIEF_COMPLAINT: patient.complaint || '',
      SPECIAL_INSTRUCTIONS: patient.notes || '',
  // Auto-approve immediately
  BOOKING_STATUS: 'approved',
    };

    const capacity = Number(activeItem.capacity || 1) || 1;
    const serviceId = record.SERVICE_ID;
    const slotDate = record.DATE_OF_APPOINTMENT;
    const slotTime = record.TIME_SLOT;

    // Reserve slot atomically; if full, show error
    appointmentsService.reserveSlot(serviceId, slotDate, slotTime, capacity)
      .then(async (reserved) => {
        if (!reserved) {
          alert('Sorry, this service at the selected date and time is already fully booked. Please choose another time.');
          return;
        }
        try {
          const created = await appointmentsService.create(record);
          await appointmentsService.indexAppointmentBySlot(serviceId, slotDate, slotTime, created.id);
          alert('Appointment booked and automatically approved. See you then!');
        } catch (err) {
          // Rollback reservation on failure
          await appointmentsService.releaseSlot(serviceId, slotDate, slotTime);
          console.error('Failed to submit appointment', err);
          alert('Failed to submit appointment. Please try again.');
        }
      })
      .catch((err) => {
        console.error('Reservation error', err);
        alert('Failed to reserve the selected time. Please try again.');
      });
  };

  return (
    <div className={styles.wrapper}>
      <aside className={styles.infoCard}>
        <h3 className={styles.infoTitle}>Service Center</h3>
        <div className={styles.infoBody}>
          <div className={styles.label}>Service</div>
          <div className={styles.selectedService}>{activeItem?.title || 'Select a service below'}</div>
          {activeItem?.availability && (
            <div className={styles.smallNote}><b>Hours:</b> {activeItem.availability}</div>
          )}
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
          <div className={styles.scheduleControls}>
            <input
              type="date"
              className={styles.input}
              value={date}
              min={tomorrowStr}
              onChange={(e)=>{
                const v = e.target.value;
                if (!v) { setDate(""); setTime(""); return; }
                const clamped = v < tomorrowStr ? tomorrowStr : v;
                setDate(clamped);
                setTime("");
              }}
            />
            <div className={styles.timeTabs}>
              {['Morning','Noon','Evening'].map(tab => (
                <button key={tab} type="button" className={`${styles.tab} ${timeOfDay===tab?styles.activeTab:''}`} onClick={()=>setTimeOfDay(tab)}>{tab}</button>
              ))}
            </div>
          </div>
          <div className={styles.slotsWrap}>
            {!date ? (
              <div className={styles.empty}>Select a date to see available times.</div>
            ) : filteredByTimeOfDay.length === 0 ? (
              <div className={styles.empty}>No available slots for the selected date/time of day.</div>
            ) : (
              <div className={styles.slots}>
                {filteredByTimeOfDay.map(hhmm => (
                  <button key={hhmm} type="button" className={`${styles.slotBtn} ${time===hhmm?styles.slotSelected:''}`} onClick={()=>setTime(hhmm)}>
                    {labelFromHHMM(hhmm)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <form onSubmit={onSubmit} className={styles.form}>
          <h3>Your Booking Details</h3>
          <div className={styles.formGrid}>
            <div className={styles.formGroup}><label className={styles.label}>First Name</label><input className={styles.input} value={patient.firstName} onChange={(e)=>setPatient(p=>({...p,firstName:e.target.value}))} required /></div>
            <div className={styles.formGroup}><label className={styles.label}>Last Name</label><input className={styles.input} value={patient.lastName} onChange={(e)=>setPatient(p=>({...p,lastName:e.target.value}))} required /></div>
            <div className={styles.formGroup}><label className={styles.label}>Phone</label><input className={styles.input} type="tel" value={patient.phone} onChange={(e)=>setPatient(p=>({...p,phone:e.target.value}))} /></div>
            <div className={styles.formGroup}><label className={styles.label}>Email</label><input className={styles.input} type="email" value={patient.email} onChange={(e)=>setPatient(p=>({...p,email:e.target.value}))} /></div>
            <div className={styles.formGroup}><label className={styles.label}>Birthday</label><input className={styles.input} type="date" value={patient.birthday} onChange={(e)=>setPatient(p=>({...p,birthday:e.target.value}))} /></div>
            <div className={styles.formGroup}><label className={styles.label}>Gender</label><select className={styles.input} value={patient.gender} onChange={(e)=>setPatient(p=>({...p,gender:e.target.value}))}><option value="">Select</option><option>Male</option><option>Female</option><option>Other</option></select></div>
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
    </div>
  );
}
