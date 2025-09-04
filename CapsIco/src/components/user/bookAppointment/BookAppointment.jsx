import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import styles from "./BookAppointment.module.css";

// Centralized services for booking, aligned with Services page
const services = [
  {
    id: "laboratory",
    name: "Laboratory",
    provider: "Prime Medical Laboratory",
    schedule: {
      weekday: { days: [1, 2, 3, 4, 5, 6], start: "07:00", end: "16:00", cutoff: "15:30" },
      sunday: { days: [0], start: "07:30", end: "11:30" },
    },
    note: "Mon-Sat 7:00 AM - 4:00 PM (3:30 PM cutoff). Sunday 7:30 AM - 11:30 AM.",
    short: "Mon-Sat 7-4; Sun 7:30-11:30",
    priceNote: "Prices vary by test panel and doctor's request; bundles available.",
  },
  { id: "xray", name: "X-ray", provider: "Radiology Team", schedule: { days: [0,1,2,3,4,5,6], start: "09:00", end: "16:00" }, note: "Daily 9:00 AM - 4:00 PM.", short: "Daily 9-4", priceNote: "Price depends on requested view/area and plates." },
  { id: "ultrasound", name: "Ultrasound", provider: "Radiology Team", schedule: { days: [1,3,5], start: "14:00", end: "17:00" }, note: "Mon, Wed, Fri 2:00 PM - 5:00 PM.", short: "Mon/Wed/Fri 2-5", priceNote: "Price depends on study (upper abdomen, pelvic, breast)." },
  { id: "ecg", name: "12-Lead ECG", provider: "Cardiology Desk", schedule: { days: [0,1,2,3,4,5,6], start: "09:00", end: "18:00" }, note: "Daily 9:00 AM - 6:00 PM.", short: "Daily 9-6", price: "PHP 250" },
  { id: "drugtest", name: "Drug Testing", provider: "Toxicology Desk", schedule: { days: [0,1,2,3,4,5,6], start: "09:00", end: "18:00" }, note: "Daily 9:00 AM - 6:00 PM.", short: "Daily 9-6", price: "PHP 280" },
  { id: "animalBite", name: "Animal Bite Center", provider: "ABTC Team", schedule: { days: [1,3,4,6], start: "08:00", end: "16:00" }, note: "Mon, Wed, Thu, Sat 8:00 AM - 4:00 PM. Free anti-rabies vaccine is walk-in and first-come, first-served.", short: "Mon/Wed/Thu/Sat 8-4", priceNote: "Total cost depends on vaccine doses, ERIG need and follow-ups." },
  { id: "freeRabies", name: "Free Anti-Rabies Vaccine", provider: "ABTC Team", type: "per-appointment", note: "Walk-in only on Mon/Wed/Thu/Sat, 8:00 AM - 4:00 PM (last call 3:30 PM). First-come, first-served; first 30 patients.", short: "Walk-in Mon/Wed/Thu/Sat 8-4", priceNote: "Vaccine is free on listed days for eligible patients; other meds/procedures may have costs." },
  { id: "consultation", name: "Consultation", provider: "Clinic Physicians", schedule: { days: [0,1,2,3,4,5,6], start: "09:00", end: "18:00" }, note: "Daily 9:00 AM - 6:00 PM.", short: "Daily 9-6", priceNote: "Professional fee varies by doctor and case." },
];

// Lightweight catalog mirroring Services page (for quick selection)
const packagesCatalog = [
  { title: 'Comprehensive Diagnostic Package', summary: 'Hypertension/Diabetes/Kidney/Liver/Heart/UTS screening with ECG and lipid profile.' },
  { title: 'Animal Bite Treatment Package', summary: 'Assessment, wound care, vaccine/ERIG plan. Prices depend on case.' },
  { title: 'Pre-Employment Package A', summary: 'CBC, Urinalysis, Chest X-ray.' },
  { title: 'Pre-Employment Package B', summary: 'CBC, Urinalysis, Chest X-ray, Drug Test.' },
  { title: 'Pre-Employment Package C', summary: 'CBC, Urinalysis, Chest X-ray, Drug Test, Fecalysis.' },
  { title: 'Pre-Employment Package D', summary: 'Add HBsAg to Package C.' },
  { title: 'Pre-Employment Package E', summary: 'Add Anti-HAV (IgM) to Package C.' },
];

const servicesCatalog = [
  { title: 'Free Anti-Rabies Vaccine', summary: 'Mon/Wed/Thu/Sat 8:00 AM - 4:00 PM; last call 3:30 PM; first 30 walk-ins.', pinned: true },
  { title: 'Complete Laboratory', summary: 'Chemistry, hematology and urinalysis; bundled panels available.' },
  { title: 'X-ray / Ultrasound', summary: 'General radiography and ultrasound imaging.' },
  { title: '12-Lead ECG', summary: 'Heart rhythm analysis (rate posted on Services page).' },
  { title: 'Drug Testing', summary: 'Standard screening (rate posted on Services page).' },
  { title: 'Animal Bite Center', summary: 'Walk-in assessment, wound care, vaccine/ERIG guidance.' },
  { title: 'Pap Smear', summary: 'Cervical cancer screening; method may vary.' },
  { title: 'Circumcision', summary: 'All-in package.' },
  { title: 'Vaccination', summary: 'Routine and catch-up immunizations; brand/age dependent.' },
  { title: 'Neuro Psychological Test', summary: 'Psychometric evaluation for employment/clearance.' },
  { title: 'Annual Medical Examination', summary: 'Company/individual checkup; customizable package.' },
  { title: 'Home Service Laboratory & Checkup', summary: 'At-home specimen collection and basic checkups.' },
  { title: 'Medical Certificate', summary: 'Issued after evaluation for work/school/travel.' },
  { title: 'Rapid Antigen Test', summary: 'SARS-CoV-2 rapid antigen screening.' },
  { title: 'Multispecialty Clinic', summary: 'Consults with trusted specialists.' },
  { title: 'HMO / Healthcards', summary: 'Processing for covered tests and consults.' },
  { title: 'Animal Bite PhilHealth Konsulta Assistance', summary: 'PHP 5,850 assistance for animal bite treatment (per PhilHealth rules).' },
  { title: 'PhilHealth Konsulta (Assistance)', summary: 'PHP 1,700 assistance each for member/dependent/senior subject to MD request.' },
];

function pad(n) { return n.toString().padStart(2, "0"); }
function minutesFromHHMM(hhmm) { const [h,m] = hhmm.split(":").map(Number); return h*60 + m; }
function toHHMM(mins) { const h = Math.floor(mins/60), m = mins%60; return `${pad(h)}:${pad(m)}`; }
function labelFromHHMM(hhmm) { const [h,m]=hhmm.split(":").map(Number); const ampm=h>=12?"PM":"AM"; const h12=h%12===0?12:h%12; return `${h12}:${pad(m)} ${ampm}`; }

export function BookAppointment() {
  const location = useLocation();
  const [activeServiceId, setActiveServiceId] = useState("laboratory");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [timeOfDay, setTimeOfDay] = useState("Morning");
  const [patient, setPatient] = useState({ firstName: "", lastName: "", phone: "", email: "", gender: "", birthday: "", complaint: "", notes: "" });

  const activeService = useMemo(() => services.find(s => s.id === activeServiceId), [activeServiceId]);

  const slots = useMemo(() => {
    if (!date) return [];
    const d = new Date(date + "T00:00:00");
    const dow = d.getDay();
    if (activeService?.type === 'per-appointment') return [];
    if (activeServiceId === 'laboratory') {
      const isSunday = dow === 0;
      const sched = isSunday ? activeService.schedule.sunday : activeService.schedule.weekday;
      const startMin = minutesFromHHMM(sched.start);
      const endMin = minutesFromHHMM(sched.end);
      const lastMin = sched.cutoff ? minutesFromHHMM(sched.cutoff) : endMin;
      const step = 30; const times = [];
      for (let t=startMin;t<=lastMin;t+=step) times.push(toHHMM(t));
      return times;
    }
    const { schedule } = activeService || {};
    if (!schedule || !schedule.days.includes(dow)) return [];
    const startMin = minutesFromHHMM(schedule.start);
    const endMin = minutesFromHHMM(schedule.end);
    const step = 30; const times = [];
    for (let t=startMin;t<=endMin;t+=step) times.push(toHHMM(t));
    return times;
  }, [date, activeService, activeServiceId]);

  const filteredByTimeOfDay = useMemo(() => {
    if (!slots.length) return [];
    return slots.filter((hhmm) => {
      const mins = minutesFromHHMM(hhmm);
      if (timeOfDay === 'Morning') return mins < minutesFromHHMM('12:00');
      if (timeOfDay === 'Noon') return mins >= minutesFromHHMM('12:00') && mins < minutesFromHHMM('17:00');
      return mins >= minutesFromHHMM('17:00');
    });
  }, [slots, timeOfDay]);

  // Map a ServicesContent item title to a local service id
  const mapItemToServiceId = (title = "") => {
    const t = title.toLowerCase();
    if (t.includes("x-ray") || t.includes("xray")) return "xray";
    if (t.includes("ultrasound")) return "ultrasound";
    if (t.includes("ecg")) return "ecg";
    if (t.includes("drug")) return "drugtest";
    if (t.includes("laboratory") || t.includes("pre-employment") || t.includes("comprehensive")) return "laboratory";
    if (t.includes("free anti") || t.includes("anti-rabies")) return "freeRabies";
    if (t.includes("animal bite")) return "animalBite";
    if (t.includes("konsulta")) return "consultation";
    return null;
  };

  // Initialize from Services page selection (only set the service; do not modify notes)
  useEffect(() => {
    const item = location.state && location.state.selectedItem;
    if (!item) return;
    const mapped = mapItemToServiceId(item.title);
    if (mapped) setActiveServiceId(mapped);
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
  }, [browseTab, search]);

  const selectFromCatalog = (title) => {
    const sid = mapItemToServiceId(title) || 'consultation';
    setActiveServiceId(sid);
  };

  const onSubmit = (e) => {
    e.preventDefault();
    const payload = { service: activeServiceId, date, time, patient };
    console.log('Booking payload', payload);
    alert('Appointment submitted. This is a demo.');
  };

  return (
    <div className={styles.wrapper}>
      <aside className={styles.infoCard}>
        <h3 className={styles.infoTitle}>Service Center</h3>
        <div className={styles.infoBody}>
          <label className={styles.label}>Service</label>
          <select className={styles.select} value={activeServiceId} onChange={(e)=>{setActiveServiceId(e.target.value); setTime("");}}>
            {services.map(s => (
              <option value={s.id} key={s.id}>
                {s.name} — {s.short || s.provider}
              </option>
            ))}
          </select>
          <div className={styles.smallNote}><b>Hours:</b> {activeService?.note}</div>
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
            <input type="date" className={styles.input} value={date} min={new Date().toISOString().split('T')[0]} onChange={(e)=>{setDate(e.target.value); setTime("");}} />
            <div className={styles.timeTabs}>
              {['Morning','Noon','Evening'].map(tab => (
                <button key={tab} type="button" className={`${styles.tab} ${timeOfDay===tab?styles.activeTab:''}`} onClick={()=>setTimeOfDay(tab)}>{tab}</button>
              ))}
            </div>
          </div>
          <div className={styles.slotsWrap}>
            {activeService?.type === 'per-appointment' ? (
              <div className={styles.empty}>Walk-in only / Request-based. Please proceed with the request form below.</div>
            ) : !date ? (
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
            <div className={styles.formGroup}><label className={styles.label}>Phone</label><input className={styles.input} type="tel" value={patient.phone} onChange={(e)=>setPatient(p=>({...p,phone:e.target.value}))} required /></div>
            <div className={styles.formGroup}><label className={styles.label}>Email</label><input className={styles.input} type="email" value={patient.email} onChange={(e)=>setPatient(p=>({...p,email:e.target.value}))} /></div>
            <div className={styles.formGroup}><label className={styles.label}>Birthday</label><input className={styles.input} type="date" value={patient.birthday} onChange={(e)=>setPatient(p=>({...p,birthday:e.target.value}))} /></div>
            <div className={styles.formGroup}><label className={styles.label}>Gender</label><select className={styles.input} value={patient.gender} onChange={(e)=>setPatient(p=>({...p,gender:e.target.value}))}><option value="">Select</option><option>Male</option><option>Female</option></select></div>
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label className={styles.label}>Chief Complaint</label>
              <input
                className={styles.input}
                placeholder="e.g., Dog bite left calf today; washed wound. OR Chest tightness"
                value={patient.complaint}
                onChange={(e)=>setPatient(p=>({...p,complaint:e.target.value}))}
              />
              <div className={styles.smallNote}>Briefly describe your main problem, location and duration.</div>
            </div>
            <div className={`${styles.formGroup} ${styles.fullWidth}`}>
              <label className={styles.label}>Special Instructions</label>
              <textarea
                className={styles.textarea}
                rows="3"
                placeholder="e.g., Allergic to penicillin; please call before arrival; needs wheelchair access; pre-employment form to be filled."
                value={patient.notes}
                onChange={(e)=>setPatient(p=>({...p,notes:e.target.value}))}
              />
              <div className={styles.smallNote}>Add preparation notes, allergies, preferences or access needs.</div>
            </div>
          </div>
          <div className={styles.actions}>
            <button type="submit" className={styles.primaryBtn} disabled={activeService?.type !== 'per-appointment' && (!date || !time)}>
              {activeService?.type === 'per-appointment' ? 'Request Appointment' : 'Book Now'}
            </button>
          </div>
        </form>
      </section>

      <aside className={styles.summaryCard}>
        <h3>Your Appointment Details</h3>
        <div className={styles.summaryRow}><span>Service</span><strong>{activeService?.name}</strong></div>
        <div className={styles.summaryRow}><span>Provider</span><strong>{activeService?.provider}</strong></div>
        <div className={styles.summaryRow}><span>Price</span><strong>{activeService?.price || 'Varies'}</strong></div>
        <div className={styles.summaryRow}><span>Date</span><strong>{date || '-'}</strong></div>
        <div className={styles.summaryRow}><span>Time</span><strong>{time ? labelFromHHMM(time) : '-'}</strong></div>
        <div className={styles.summaryNote}>Arrive 10 minutes early. Follow preparation instructions where applicable.</div>
        {activeService?.priceNote && (
          <div className={styles.summaryPriceNote}>{activeService.priceNote}</div>
        )}
      </aside>
    </div>
  );
}
