// Frontend appointment email template builder (mirrors backend style simplified)
// Exports: buildAppointmentEmail({ record, effectiveStatus }) -> { subject, html, text }
import { buildStatusSubject } from './appointmentEmailSubject.js';

function pad(n){return String(n).padStart(2,'0');}
function formatDate(dateStr){
  if(!dateStr) return '';
  if(/^\d{4}-\d{2}-\d{2}$/.test(dateStr)){
    const [y,m,d]=dateStr.split('-').map(Number);const dt=new Date(y,(m||1)-1,d||1);
    if(!isNaN(dt.getTime())){
      return dt.toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'});
    }
  }
  const dt=new Date(dateStr);if(!isNaN(dt.getTime())) return dt.toLocaleDateString(undefined,{year:'numeric',month:'long',day:'numeric'});
  return dateStr;
}
function formatTime(hhmm){
  if(!hhmm) return '';
  const [hStr,mStr]=String(hhmm).split(':');
  const h=Number(hStr), m=Number(mStr||0);
  if(isNaN(h)||isNaN(m)) return hhmm;
  const ampm=h>=12?'PM':'AM';
  const h12=h%12===0?12:h%12;
  return `${h12}:${pad(m)} ${ampm}`;
}
function toTitle(str){return String(str||'').replace(/\s+/g,' ').trim().replace(/\b\w/g,c=>c.toUpperCase());}

export function buildAppointmentEmail({record={}, effectiveStatus}){
  const rec={...record};
  const statusRaw=String(effectiveStatus||rec.BOOKING_STATUS||'pending').toLowerCase();
  const hasRes=!!(rec.RESCHEDULE_INFO||rec.rescheduleInfo);
  const statusTitle = hasRes && (statusRaw==='rescheduled' || statusRaw==='approved') ? 'Reschedule Approved'
    : (hasRes && statusRaw==='pending') ? 'Reschedule Requested'
    : statusRaw==='approved' ? 'Approved'
    : statusRaw==='declined' ? 'Declined'
    : statusRaw==='successful' ? 'Successful'
    : 'Pending';
  const heading = statusTitle==='Reschedule Approved' ? 'Reschedule Confirmed'
    : statusTitle==='Approved' ? 'Appointment Confirmed'
    : statusTitle==='Declined' ? 'Appointment Update'
    : statusTitle==='Successful' ? 'Appointment Completed'
    : statusTitle==='Reschedule Requested' ? 'Reschedule Request Received'
    : 'Appointment Request Received';
  const lead = statusTitle==='Reschedule Approved' ? 'Your reschedule has been approved. Here are your updated appointment details:'
    : statusTitle==='Approved' ? 'Your appointment has been approved. Below are the details:'
    : statusTitle==='Declined' ? 'We’re sorry, your appointment request was declined. Here are the details:'
    : statusTitle==='Successful' ? 'Your appointment was marked as completed. Summary below:'
    : statusTitle==='Reschedule Requested' ? 'We received your reschedule request and will notify you when it is approved. Details below:'
    : 'We received your appointment request and will notify you upon approval. Details below:';
  const date=formatDate(rec.DATE_OF_APPOINTMENT||'');
  const time=formatTime(rec.TIME_SLOT||'');
  const serviceType=(rec.SERVICE_TYPE||'').toLowerCase()==='package'?'Package':'Service';
  const serviceName= rec.SERVICE_NAME || rec.serviceName || rec.SERVICE || rec.PACKAGE_NAME || `Selected ${serviceType}`;
  const apptId= rec.APPT_ID || rec.id || '';
  const complaint= rec.CHIEF_COMPLAINT || '';
  const notes= rec.SPECIAL_INSTRUCTIONS || '';
  const proofUrl= rec.PROOF || rec.proof || '';
  const declineReason= rec.DECLINE_REASON || rec.declineReason || '';
  const res= rec.RESCHEDULE_INFO || rec.rescheduleInfo || null;
  const subject = buildStatusSubject({
    ...rec,
    SERVICE_NAME: serviceName,
    SERVICE_TYPE: serviceType.toLowerCase(),
    DATE_OF_APPOINTMENT: rec.DATE_OF_APPOINTMENT,
    TIME_SLOT: rec.TIME_SLOT,
    BOOKING_STATUS: statusRaw,
  });
  // Plain text fallback
  const textLines=[
    heading,
    '',
    lead,
    '',
    `Service: ${serviceName}`,
    `Type: ${serviceType}`,
    `Date: ${date}`,
    `Time: ${time}`,
    `Status: ${statusTitle}`,
  ];
  if(res && (res.oldDate||res.newDate)) textLines.push(`Reschedule: ${(res.oldDate||'')} ${(res.oldTime||'')} -> ${(res.newDate||'')} ${(res.newTime||'')}`);
  if(complaint) textLines.push(`Chief Complaint: ${complaint}`);
  if(notes) textLines.push(`Special Instructions: ${notes}`);
  if(statusTitle==='Declined' && declineReason) textLines.push(`Reason: ${declineReason}`);
  if(proofUrl) textLines.push(`Proof Image: ${proofUrl}`);
  textLines.push('', 'Prime Medical Laboratory');
  const text=textLines.join('\n');

  const proofBlock = (statusTitle==='Successful' && proofUrl) ? `<div style="margin:18px 0 4px"><div style="font-size:13px;font-weight:700;color:#93a4c8;margin:0 0 6px">Proof Image</div><a href="${proofUrl}" target="_blank" rel="noopener" style="display:inline-block;border:1px solid #1c2944;background:#0b1327;border-radius:12px;padding:10px;text-decoration:none"><img src="${proofUrl}" alt="Proof" style="max-width:260px;max-height:200px;display:block;border-radius:8px"/><div style="font-size:11px;color:#60a5fa;margin-top:6px;text-align:center">Open full size ↗</div></a></div>` : '';
  const html=`<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${heading}</title><meta name="viewport" content="width=device-width,initial-scale=1"/><style>body{margin:0;padding:28px;background:#0b1220;font-family:Segoe UI,Roboto,Arial,sans-serif;color:#e2e8f0} .wrap{max-width:760px;margin:0 auto} .brand{background:linear-gradient(135deg,#1d4ed8,#7c3aed);border-radius:16px 16px 0 0;padding:18px 20px;color:#fff;font-weight:800;font-size:17px;letter-spacing:.02em} .card{background:#0f172a;border:1px solid #1f2a44;border-top:0;border-radius:0 0 16px 16px} .content{padding:22px} h1{margin:10px 0 8px;font-size:24px;color:#fff} p{margin:12px 0;line-height:1.5} .summary{margin:14px 0 8px;padding:14px;border:1px solid #263451;border-radius:12px;background:#0b1327} .summaryTitle{font-weight:800;font-size:16px;margin:0 0 8px} .chips{display:flex;flex-wrap:wrap;gap:8px} .chip{background:#0f1c38;border:1px solid #253a66;color:#cfe1ff;padding:6px 10px;border-radius:999px;font-size:12px;font-weight:700} table{border-collapse:collapse;width:100%;margin-top:14px;font-size:14px} td{padding:10px 12px;border-bottom:1px solid #1c2944;vertical-align:top} tr:last-child td{border-bottom:0} .label{color:#93a4c8;font-size:12px;width:160px;white-space:nowrap} .val{font-weight:600;color:#e2e8f0} .foot{padding:16px 22px;color:#93a4c8;font-size:12px;border-top:1px solid #1c2944}</style></head><body><div class="wrap"><div class="brand">Prime Medical Laboratory</div><div class="card"><div class="content"><h1>${heading}</h1><p>Hello ${toTitle(rec.FIRST_NAME)} ${toTitle(rec.LAST_NAME)},</p><p>${lead}</p><div class="summary"><div class="summaryTitle">${serviceName}</div><div class="chips"><span class="chip">${serviceType}</span><span class="chip">${date}</span><span class="chip">${time}</span></div></div><table role="presentation"><tbody><tr><td class="label">Appointment ID</td><td class="val">${apptId}</td></tr><tr><td class="label">Service</td><td class="val">${serviceName}</td></tr><tr><td class="label">Type</td><td class="val">${serviceType}</td></tr><tr><td class="label">Date</td><td class="val">${date}</td></tr><tr><td class="label">Time</td><td class="val">${time}</td></tr><tr><td class="label">Status</td><td class="val">${statusTitle}</td></tr>${res && (res.oldDate||res.newDate)?`<tr><td class="label">Reschedule</td><td class="val">${formatDate(res.oldDate||rec.DATE_OF_APPOINTMENT)} ${res.oldTime? '• '+formatTime(res.oldTime):''} → ${formatDate(res.newDate||rec.DATE_OF_APPOINTMENT)} ${res.newTime? '• '+formatTime(res.newTime):''}</td></tr>`:''}${complaint?`<tr><td class="label">Chief Complaint</td><td class="val">${complaint}</td></tr>`:''}${notes?`<tr><td class="label">Special Instructions</td><td class="val">${notes}</td></tr>`:''}${statusTitle==='Declined' && declineReason?`<tr><td class="label">Reason</td><td class="val">${declineReason}</td></tr>`:''}${proofUrl?`<tr><td class="label">Proof Image</td><td class="val"><a style="color:#60a5fa" href="${proofUrl}" target="_blank" rel="noopener">View Proof</a></td></tr>`:''}</tbody></table>${proofBlock}</div><div class="foot">Please arrive 10 minutes early. If you need to reschedule, use the Reschedule option in your profile. © ${new Date().getFullYear()} Prime Medical Laboratory</div></div></div></body></html>`;
  return { subject, html, text };
}

export default buildAppointmentEmail;
