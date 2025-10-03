<<<<<<< HEAD
/*
 Cloud Functions to send email notifications on appointment creation.
 Uses SendGrid. Configure API key and sender in environment config:
   firebase functions:config:set sendgrid.key="SG.xxxxxx" sendgrid.sender="no-reply@yourdomain.com" app.public_url="https://yourapp.web.app"
*/
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');

try {
  admin.initializeApp();
} catch (_) {}

const cfg = functions.config() || {};
const sgKey = cfg.sendgrid && cfg.sendgrid.key ? cfg.sendgrid.key : null;
const sender = cfg.sendgrid && cfg.sendgrid.sender ? cfg.sendgrid.sender : null;
const appPublicUrl = (cfg.app && cfg.app.public_url) || '';

if (sgKey) {
  sgMail.setApiKey(sgKey);
}

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

function buildConfirmationHTML(rec) {
  const name = `${toTitle(rec.FIRST_NAME)} ${toTitle(rec.LAST_NAME)}`.trim();
  const date = rec.DATE_OF_APPOINTMENT || '';
  const time = formatTimeLabel(rec.TIME_SLOT || '');
  const serviceType = (rec.SERVICE_TYPE || '').toLowerCase() === 'package' ? 'Package' : 'Service';
  const serviceName = rec.SERVICE_NAME || `Selected ${serviceType}`;
  const apptId = rec.APPT_ID || rec.id || '';
  const status = toTitle(rec.BOOKING_STATUS || 'Approved');
  const notes = rec.SPECIAL_INSTRUCTIONS || '';
  const complaint = rec.CHIEF_COMPLAINT || '';
  const ctaUrl = appPublicUrl || '';
  return `<!DOCTYPE html>
  <html><head><meta charset="utf-8"><title>Appointment Confirmation</title>
  <style>
    body{font-family:Segoe UI, Roboto, Arial, sans-serif;color:#0f172a}
    .card{max-width:640px;margin:0 auto;border:1px solid #e2e8f0;border-radius:10px;padding:16px}
    .muted{color:#475569;font-size:13px}
    .row{display:flex;justify-content:space-between;padding:6px 0;border-bottom:1px solid #f1f5f9}
    .label{color:#475569}
    .val{font-weight:600}
    .cta{display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:10px 16px;border-radius:8px;margin-top:12px}
  </style></head>
  <body>
  <div class="card">
    <h2>Appointment Confirmed</h2>
    <p>Hello ${name || 'there'},</p>
    <p>Your appointment has been booked and approved. Below are the details:</p>
    <div class="row"><div class="label">Appointment ID</div><div class="val">${apptId}</div></div>
    <div class="row"><div class="label">Service</div><div class="val">${serviceName}</div></div>
    <div class="row"><div class="label">Type</div><div class="val">${serviceType}</div></div>
    <div class="row"><div class="label">Date</div><div class="val">${date}</div></div>
    <div class="row"><div class="label">Time</div><div class="val">${time}</div></div>
    <div class="row"><div class="label">Status</div><div class="val">${status}</div></div>
    ${complaint ? `<div class="row"><div class="label">Chief Complaint</div><div class="val">${complaint}</div></div>` : ''}
    ${notes ? `<div class="row"><div class="label">Special Instructions</div><div class="val">${notes}</div></div>` : ''}
    ${ctaUrl ? `<a class="cta" href="${ctaUrl}" target="_blank" rel="noopener">View your booking</a>` : ''}
    <p class="muted">Please arrive 10 minutes early. If you need to reschedule, reply to this email.</p>
  </div>
  </body></html>`;
}

exports.onAppointmentCreate = functions.database
  .ref('/appointments/{apptId}')
  .onCreate(async (snapshot, context) => {
    const apptId = context.params.apptId;
    const rec = snapshot.val() || {};
    // Enrich record with id for template convenience
    rec.APPT_ID = rec.APPT_ID || apptId;

    const to = (rec.EMAIL || '').trim();
    if (!to) {
      console.log(`[onAppointmentCreate] No recipient email for ${apptId}`);
      return null;
    }
    if (!sgKey || !sender) {
      console.warn('[onAppointmentCreate] Missing SendGrid config; skipping email send');
      return null;
    }

    const html = buildConfirmationHTML(rec);
    const msg = {
      to,
      from: sender,
      subject: `Your Appointment is Confirmed (${rec.DATE_OF_APPOINTMENT || ''} ${rec.TIME_SLOT || ''})`,
      html,
    };
    try {
      await sgMail.send(msg);
      console.log(`[onAppointmentCreate] Email sent to ${to} for ${apptId}`);
    } catch (err) {
      console.error('[onAppointmentCreate] Send email failed', err);
    }
=======
const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// Configuration: Firestore collection that the Trigger Email extension listens to
// By default the extension uses collection "mail" with documents containing fields:
// to, message: { subject, text or html }
const MAIL_COLLECTION = process.env.MAIL_COLLECTION || 'mail';

// Example: mirror new Realtime Database entries under /emailQueue into Firestore "mail" collection
// Shape expected in RTDB: { to: string | string[], subject: string, text?: string, html?: string, cc?, bcc?, template?, data? }
exports.enqueueEmailOnRtdbWrite = functions.database
  .ref('/emailQueue/{pushId}')
  .onCreate(async (snapshot, context) => {
    const payload = snapshot.val();
    if (!payload) return null;

    // Basic validation
    const to = payload.to;
    const subject = payload.subject;
    const { text, html, cc, bcc, replyTo, template, data } = payload;

    if (!to || !subject || (!text && !html && !template)) {
      console.warn('Invalid email payload, missing required fields', payload);
      return null;
    }

    const mailDoc = {
      to,
      cc,
      bcc,
      replyTo,
      template, // If using Email Templates extension + Trigger Email
      // If using Trigger Email without templates, put content under message
      message: template
        ? undefined
        : {
            subject,
            ...(html ? { html } : { text: text || '' }),
          },
      data, // Variables for templates if used
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      source: 'rtdb-enqueueEmailOnRtdbWrite',
      _rtdbRef: snapshot.ref.toString(),
    };

    // Remove undefined keys
    Object.keys(mailDoc).forEach((k) => mailDoc[k] === undefined && delete mailDoc[k]);

    const db = admin.firestore();
    await db.collection(MAIL_COLLECTION).add(mailDoc);

    // Optionally, mark RTDB node as processed or delete it to avoid reprocessing
    await snapshot.ref.update({ processedAt: admin.database.ServerValue.TIMESTAMP });

>>>>>>> backup/book-appointment-slots-and-birthday
    return null;
  });
