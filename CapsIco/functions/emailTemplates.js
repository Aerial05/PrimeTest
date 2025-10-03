// Reusable email template builders for appointment notifications
// CommonJS module so it can be required from Cloud Functions (index.js)

function toTitle(s) {
  const v = String(s || '').trim();
  if (!v) return '';
  return v.replace(/\s+/g, ' ').replace(/\b\w/g, (m) => m.toUpperCase());
}

function formatTimeLabel(hhmm) {
  const [h, m] = String(hhmm || '').split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return String(hhmm || '');
  const ampm = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`;
}

// Build a human-friendly subject based on status and details
function buildStatusSubject(rec) {
  const date = rec.DATE_OF_APPOINTMENT || '';
  const time = rec.TIME_SLOT || '';
  const status = String(rec.BOOKING_STATUS || '').toLowerCase();
  if (status === 'approved') return `Appointment Confirmed (${date} ${time})`;
  if (status === 'declined') return `Appointment Update (${date} ${time})`;
  if (status === 'successful') return `Appointment Completed (${date} ${time})`;
  return `Appointment Request Received (${date} ${time})`;
}

// Main HTML builder for appointment emails
function buildAppointmentEmailHTML(rec, opts = {}) {
  const appPublicUrl = opts.appPublicUrl || '';
  const name = `${toTitle(rec.FIRST_NAME)} ${toTitle(rec.LAST_NAME)}`.trim();
  const date = rec.DATE_OF_APPOINTMENT || '';
  const time = formatTimeLabel(rec.TIME_SLOT || '');
  const serviceType = (rec.SERVICE_TYPE || '').toLowerCase() === 'package' ? 'Package' : 'Service';
  const serviceName = rec.SERVICE_NAME || rec.NAME || `Selected ${serviceType}`;
  const apptId = rec.APPT_ID || rec.id || '';
  const statusTitle = toTitle(rec.BOOKING_STATUS || 'Pending');
  const notes = rec.SPECIAL_INSTRUCTIONS || '';
  const complaint = rec.CHIEF_COMPLAINT || '';

  const heading = statusTitle === 'Approved'
    ? 'Appointment Confirmed'
    : statusTitle === 'Declined'
    ? 'Appointment Update'
    : statusTitle === 'Successful'
    ? 'Appointment Completed'
    : 'Appointment Request Received';

  const lead = statusTitle === 'Approved'
    ? 'Your appointment has been approved. Below are the details:'
    : statusTitle === 'Declined'
    ? 'We’re sorry, your appointment request was declined. Here are the details:'
    : statusTitle === 'Successful'
    ? 'Your appointment was marked as completed. Thank you for visiting. Summary below:'
    : 'We received your appointment request and will notify you upon approval. Details below:';

  return `<!DOCTYPE html>
  <html><head><meta charset="utf-8"><title>${heading}</title>
  <style>
    body{font-family:Segoe UI, Roboto, Arial, sans-serif;color:#0f172a;background:#f8fafc;padding:16px}
    .card{max-width:640px;margin:0 auto;border:1px solid #e2e8f0;border-radius:10px;padding:16px;background:#ffffff}
    .muted{color:#475569;font-size:13px}
    .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f1f5f9}
    .label{color:#475569}
    .val{font-weight:600}
    .cta{display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;margin-top:12px}
  </style></head>
  <body>
  <div class="card">
    <h2>${heading}</h2>
    <p>Hello ${name || 'there'},</p>
    <p>${lead}</p>
    <div class="row"><div class="label">Appointment ID</div><div class="val">${apptId}</div></div>
    <div class="row"><div class="label">Service</div><div class="val">${serviceName}</div></div>
    <div class="row"><div class="label">Type</div><div class="val">${serviceType}</div></div>
    <div class="row"><div class="label">Date</div><div class="val">${date}</div></div>
    <div class="row"><div class="label">Time</div><div class="val">${time}</div></div>
    <div class="row"><div class="label">Status</div><div class="val">${statusTitle}</div></div>
    ${complaint ? `<div class="row"><div class="label">Chief Complaint</div><div class="val">${complaint}</div></div>` : ''}
    ${notes ? `<div class="row"><div class="label">Special Instructions</div><div class="val">${notes}</div></div>` : ''}
    ${appPublicUrl ? `<a class="cta" href="${appPublicUrl}" target="_blank" rel="noopener">View your booking</a>` : ''}
    <p class="muted">Please arrive 10 minutes early. If you need to reschedule, reply to this email.</p>
  </div>
  </body></html>`;
}

module.exports = {
  toTitle,
  formatTimeLabel,
  buildStatusSubject,
  buildAppointmentEmailHTML,
};
