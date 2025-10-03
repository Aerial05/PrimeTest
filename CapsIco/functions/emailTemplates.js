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

function formatEmailDate(input) {
  if (!input) return '';
  // Expecting YYYY-MM-DD most of the time
  if (typeof input === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(input)) {
    const [y, m, d] = input.split('-').map((v) => Number(v));
    const dt = new Date(y, (m || 1) - 1, d || 1);
    if (!Number.isNaN(dt.getTime())) {
      const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
      return `${months[dt.getMonth()]} ${dt.getDate()}, ${dt.getFullYear()}`;
    }
  }
  // Timestamps or other parseable strings
  const n = Number(input);
  let d = null;
  if (!Number.isNaN(n)) {
    d = new Date(n < 1e12 ? n * 1000 : n);
  } else {
    d = new Date(input);
  }
  if (Number.isNaN(d.getTime())) return String(input);
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

// Build a human-friendly subject based on status and details
function buildStatusSubject(rec) {
  const date = formatEmailDate(rec.DATE_OF_APPOINTMENT || '');
  const time = formatTimeLabel(rec.TIME_SLOT || '');
  const status = String(rec.BOOKING_STATUS || '').toLowerCase();
  const svcType = (rec.SERVICE_TYPE || '').toLowerCase() === 'package' ? 'Package' : 'Service';
  const name = rec.SERVICE_NAME || rec.NAME || svcType;
  if (status === 'approved') return `Appointment Confirmed • ${name} (${date} ${time})`;
  if (status === 'declined') return `Appointment Update • ${name} (${date} ${time})`;
  if (status === 'successful') return `Appointment Completed • ${name} (${date} ${time})`;
  return `Appointment Request Received • ${name} (${date} ${time})`;
}

// Main HTML builder for appointment emails
function buildAppointmentEmailHTML(rec, opts = {}) {
  const appPublicUrl = opts.appPublicUrl || '';
  const brandName = opts.brandName || 'Prime Medical Laboratory';
  const logoUrl = opts.logoUrl || '';

  const name = `${toTitle(rec.FIRST_NAME)} ${toTitle(rec.LAST_NAME)}`.trim();
  const date = formatEmailDate(rec.DATE_OF_APPOINTMENT || '');
  const time = formatTimeLabel(rec.TIME_SLOT || '');
  const serviceType = (rec.SERVICE_TYPE || '').toLowerCase() === 'package' ? 'Package' : 'Service';
  const serviceName = rec.SERVICE_NAME || rec.serviceName || rec.SERVICE || rec.PACKAGE_NAME || rec.NAME || `Selected ${serviceType}`;
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
  <html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${heading}</title>
  <style>
    body{margin:0;padding:28px;background:#0b1220;font-family:Segoe UI, Roboto, Arial, sans-serif;color:#0f172a}
    .wrap{max-width:760px;margin:0 auto}
    .brand{background:linear-gradient(135deg,#1d4ed8,#7c3aed);border-radius:16px 16px 0 0;padding:18px 20px;color:#fff;display:flex;align-items:center;gap:12px}
    .brand img{height:40px;width:auto;border-radius:8px;background:#fff}
    .brandName{font-size:17px;font-weight:800;letter-spacing:.02em}
    .card{background:#0f172a;border:1px solid #1f2a44;border-top:0;color:#e2e8f0;border-radius:0 0 16px 16px;overflow:hidden}
    .content{padding:22px}
    h1{margin:10px 0 4px 0;font-size:24px;color:#fff}
    p{margin:12px 0;color:#cbd5e1;line-height:1.5}
    .summary{margin:14px 0 8px 0;padding:14px;border:1px solid #263451;border-radius:12px;background:#0b1327}
    .summaryTitle{font-weight:800;font-size:16px;color:#e2e8f0;margin:0 0 8px 0}
    .chips{display:flex;flex-wrap:wrap;gap:8px}
    .chip{display:inline-block;background:#0f1c38;border:1px solid #253a66;color:#cfe1ff;padding:6px 10px;border-radius:999px;font-size:12px;font-weight:700}
  .grid{margin-top:14px;border:1px solid #263451;border-radius:12px;overflow:hidden;background:#0b1327}
  table{border-collapse:collapse;width:100%}
  td{padding:12px 14px;border-bottom:1px solid #1c2944;vertical-align:top}
  tr:last-child td{border-bottom:0}
  .label{color:#93a4c8;font-size:13px;white-space:nowrap;width:160px}
  .val{color:#e2e8f0;font-weight:700}
    .ctaBar{padding:18px 20px;background:#0b1327;border-top:1px solid #1c2944}
    .cta{display:inline-block;background:#22c55e;color:#0b1327;text-decoration:none;padding:12px 16px;border-radius:10px;font-weight:800}
    .foot{padding:16px 20px;color:#93a4c8;font-size:12px}
    .meta{margin:12px 0;color:#cfe1ff;font-weight:600}
  </style></head>
  <body>
  <div class="wrap">
    <div class="brand">
      ${logoUrl ? `<img alt="${brandName} logo" src="${logoUrl}" />` : ''}
      <div class="brandName">${brandName}</div>
    </div>
    <div class="card">
      <div class="content">
        <h1>${heading}</h1>
        <p>Hello ${name || 'there'},</p>
        <p>${lead}</p>
        <p class="meta">Date: ${date}, Type: ${serviceType}, Status: ${statusTitle}</p>
        <div class="summary">
          <div class="summaryTitle">${serviceName}</div>
          <div class="chips">
            <span class="chip">${ serviceType}</span>
            <span class="chip">${ date}</span>
            <span class="chip">${ time}</span>
          </div>
        </div>
        <div class="grid">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tbody>
              <tr><td class="label">Appointment ID:</td><td class="val">${apptId}</td></tr>
              <tr><td class="label">Service:</td><td class="val">${serviceName}</td></tr>
              <tr><td class="label">Type:</td><td class="val">${serviceType}</td></tr>
              <tr><td class="label">Date:</td><td class="val">${date}</td></tr>
              <tr><td class="label">Time:</td><td class="val">${time}</td></tr>
              <tr><td class="label">Status:</td><td class="val">${statusTitle}</td></tr>
              ${complaint ? `<tr><td class="label">Chief Complaint:</td><td class="val">${complaint}</td></tr>` : ''}
              ${notes ? `<tr><td class="label">Special Instructions:</td><td class="val">${notes}</td></tr>` : ''}
            </tbody>
          </table>
        </div>
      </div>
      ${appPublicUrl ? `<div class="ctaBar"><a class="cta" href="${appPublicUrl}" target="_blank" rel="noopener">View Your Booking</a></div>` : ''}
      <div class="foot">Please arrive 10 minutes early. If you need to reschedule, reply to this email.</div>
    </div>
  </div>
  </body></html>`;
}

module.exports = {
  toTitle,
  formatTimeLabel,
  buildStatusSubject,
  buildAppointmentEmailHTML,
};
