import React, { useMemo, useState } from "react";
import styles from "./BookAppointment.module.css";

const services = [
  { id: "surgeon", name: "Surgeon", provider: "Dr. Forgor", type: "per-appointment", note: "By request only. Our staff will contact you to confirm a time." },
  { id: "xray", name: "X-ray", provider: "Mr. Batoon", schedule: { days: [0,1,2,3,4,5,6], start: "09:00", end: "16:00" } },
  { id: "ibogaine", name: "Ibogaine", provider: "Dra. Aklan", schedule: { days: [2,4,6], start: "14:00", end: "17:00" } },
  { id: "ultrasound", name: "Ultra Sound", provider: "Dra. Cecile", schedule: { days: [1,3,5], start: "14:00", end: "17:00" } },
  { id: "consultation", name: "Consultation", provider: "Pediatrician / Internal Medicine (Dra. Joy)", schedule: { days: [0,1,2,3,4,5,6], start: "09:00", end: "18:00" } },
  { id: "laboratory", name: "Laboratory", provider: "PrimeLab", schedule: { weekday: { days: [1,2,3,4,5,6], start: "07:00", end: "16:00", cutoff: "15:30" }, sunday: { days: [0], start: "07:30", end: "11:30" } } },
];

function pad(n) { return n.toString().padStart(2, "0"); }
function minutesFromHHMM(hhmm) { const [h,m] = hhmm.split(":").map(Number); return h*60 + m; }
function toHHMM(mins) { const h = Math.floor(mins/60), m = mins%60; return `${pad(h)}:${pad(m)}`; }
function labelFromHHMM(hhmm) { const [h,m]=hhmm.split(":").map(Number); const ampm=h>=12?"PM":"AM"; const h12=h%12===0?12:h%12; return `${h12}:${pad(m)} ${ampm}`; }

export function BookAppointment() {
  const [activeServiceId, setActiveServiceId] = useState("xray");
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
            {services.map(s => <option value={s.id} key={s.id}>{s.name} — {s.provider}</option>)}
          </select>
          <div className={styles.smallNote}>
            {activeService?.type === 'per-appointment' ? (
              <>Per-appointment only. Submit a request and our staff will confirm your schedule.</>
            ) : activeServiceId === 'laboratory' ? (
              <>Mon–Sat 7:00 AM–4:00 PM (3:30 PM cutoff). Sunday 7:30 AM–11:30 AM.</>
            ) : activeServiceId === 'xray' ? (
              <>Daily 9:00 AM–4:00 PM.</>
            ) : activeServiceId === 'ibogaine' ? (
              <>Tue, Thu, Sat 2:00 PM–5:00 PM.</>
            ) : activeServiceId === 'ultrasound' ? (
              <>Mon, Wed, Fri 2:00 PM–5:00 PM.</>
            ) : (
              <>Daily 9:00 AM–6:00 PM.</>
            )}
          </div>
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
              <div className={styles.empty}>Per-appointment only. Please proceed with the request form below.</div>
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
            <div className={`${styles.formGroup} ${styles.fullWidth}`}><label className={styles.label}>Chief Complaint</label><input className={styles.input} value={patient.complaint} onChange={(e)=>setPatient(p=>({...p,complaint:e.target.value}))} /></div>
            <div className={`${styles.formGroup} ${styles.fullWidth}`}><label className={styles.label}>Special Instructions</label><textarea className={styles.textarea} rows="3" value={patient.notes} onChange={(e)=>setPatient(p=>({...p,notes:e.target.value}))} /></div>
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
        <div className={styles.summaryRow}><span>Date</span><strong>{date || '—'}</strong></div>
        <div className={styles.summaryRow}><span>Time</span><strong>{time ? labelFromHHMM(time) : '—'}</strong></div>
        <div className={styles.summaryNote}>Arrive 10 minutes early. Follow preparation instructions where applicable.</div>
      </aside>
    </div>
  );
}

