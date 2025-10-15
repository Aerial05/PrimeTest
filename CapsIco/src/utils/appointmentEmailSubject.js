// Shared frontend subject builder mirroring backend logic
export function buildStatusSubject(rec){
  const formatDate = (d)=>{
    if(!d) return '';
    if(/^\d{4}-\d{2}-\d{2}$/.test(d)){
      const [y,m,day]=d.split('-').map(Number);const dt=new Date(y,(m||1)-1,day||1);
      if(!isNaN(dt.getTime())) return dt.toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'});
    }
    const dt=new Date(d);return isNaN(dt.getTime())?d:dt.toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'});
  };
  const formatTime = (t)=>{
    if(!t) return '';
    const [hS,mS]=String(t).split(':');const h=Number(hS), m=Number(mS||0);
    if(isNaN(h)||isNaN(m)) return t;const ampm=h>=12?'PM':'AM';const h12=h%12===0?12:h%12;return `${h12}:${String(m).padStart(2,'0')} ${ampm}`;
  };
  const date=formatDate(rec.DATE_OF_APPOINTMENT||'');
  const time=formatTime(rec.TIME_SLOT||'');
  const status=String(rec.BOOKING_STATUS||'').toLowerCase();
  const hasRes=!!(rec.RESCHEDULE_INFO||rec.rescheduleInfo);
  const serviceType=(rec.SERVICE_TYPE||'').toLowerCase()==='package'?'Package':'Service';
  const name= rec.SERVICE_NAME || rec.serviceName || rec.SERVICE || rec.PACKAGE_NAME || serviceType;
  if(status==='rescheduled' || (status==='approved' && hasRes)) return `Reschedule Approved • ${name} (${date} ${time})`;
  if(status==='approved') return `Appointment Confirmed • ${name} (${date} ${time})`;
  if(status==='declined' && hasRes) return `Reschedule Declined • ${name} (${date} ${time})`;
  if(status==='declined') return `Appointment Update • ${name} (${date} ${time})`;
  if(status==='successful') return `Appointment Completed • ${name} (${date} ${time})`;
  if(status==='pending' && hasRes) return `Reschedule Request Received • ${name} (${date} ${time})`;
  return `Appointment Request Received • ${name} (${date} ${time})`;
}
export default buildStatusSubject;
