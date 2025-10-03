/*
 Cloud Functions to support emails:
 1) Enqueue a Firestore 'mail' document on appointment creation (Trigger Email extension sends the email).
 2) Optionally enqueue generic emails written under /emailQueue to Firestore 'mail' collection (for Trigger Email extension).

 Configure via Firebase Functions config:
   firebase functions:config:set sendgrid.key="SG.xxxxx" sendgrid.sender="no-reply@yourdomain.com" app.public_url="https://yourapp.web.app"
 You may also set MAIL_COLLECTION via environment if using Trigger Email (defaults to 'mail').
*/
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const {
  buildAppointmentEmailHTML,
  buildStatusSubject,
} = require('./emailTemplates');
// Using Firestore Trigger Email extension; no direct SMTP/SendGrid here.

try {
  admin.initializeApp();
} catch (_) {}

const cfg = functions.config() || {};
const appPublicUrl = (cfg.app && cfg.app.public_url) || '';

const MAIL_COLLECTION = process.env.MAIL_COLLECTION || 'mail';
// Deploy functions in asia-east2
const r = functions.region('asia-east2');

// Email template helpers moved to emailTemplates.js

// Helper: write a document for the Trigger Email extension
async function enqueueTriggerEmail({ to, subject, html, text, cc, bcc, replyTo, template, data, source }) {
  const mailDoc = {
    to,
    cc,
    bcc,
    replyTo,
    template,
    message: template ? undefined : { subject, ...(html ? { html } : { text: text || '' }) },
    data,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    source,
  };
  Object.keys(mailDoc).forEach((k) => mailDoc[k] === undefined && delete mailDoc[k]);
  const db = admin.firestore();
  await db.collection(MAIL_COLLECTION).add(mailDoc);
}

// 1) Appointment create -> enqueue Trigger Email (request received or approved)
exports.onAppointmentCreate = r.database
  .ref('/appointments/{apptId}')
  .onCreate(async (snapshot, context) => {
    const apptId = context.params.apptId;
    const rec = snapshot.val() || {};
    rec.APPT_ID = rec.APPT_ID || apptId;

    const to = (rec.EMAIL || '').trim();
    if (!to) {
      console.log(`[onAppointmentCreate] No recipient email for ${apptId}`);
      return null;
    }
  const html = buildAppointmentEmailHTML({ ...rec, BOOKING_STATUS: (rec.BOOKING_STATUS || 'pending') }, { appPublicUrl });
  const subject = buildStatusSubject({ ...rec, BOOKING_STATUS: rec.BOOKING_STATUS || 'pending' });
    try {
      await enqueueTriggerEmail({ to, subject, html, source: 'rtdb-onAppointmentCreate' });
      console.log(`[onAppointmentCreate] Enqueued mail for ${to} ${apptId}`);
    } catch (err) {
      console.error('[onAppointmentCreate] Enqueue mail failed', err);
    }
    return null;
  });

// Send approval email when status transitions to approved (enqueue for Trigger Email)
exports.onAppointmentStatusUpdate = r.database
  .ref('/appointments/{apptId}/BOOKING_STATUS')
  .onUpdate(async (change, context) => {
    const before = (change.before.val() || '').toString().toLowerCase();
    const after = (change.after.val() || '').toString().toLowerCase();
    if (before === after || after !== 'approved') return null;
    const apptId = context.params.apptId;
    const snap = await admin.database().ref(`/appointments/${apptId}`).get();
    if (!snap.exists()) return null;
    const rec = snap.val() || {};
    // Skip if we already sent the approved email
    if (rec.EMAIL_SENT_APPROVED === true) return null;
    const to = (rec.EMAIL || '').trim();
    if (!to) return null;
  rec.BOOKING_STATUS = 'approved';
  const html = buildAppointmentEmailHTML(rec, { appPublicUrl });
  const subject = buildStatusSubject(rec);
    try {
      await enqueueTriggerEmail({ to, subject, html, source: 'rtdb-onAppointmentStatusUpdate' });
      // Mark as sent to avoid duplicate emails
      await admin.database().ref(`/appointments/${apptId}`).update({ EMAIL_SENT_APPROVED: true });
    }
    catch (e) { console.error('Approval email enqueue failed', e); }
    return null;
  });

// 2) RTDB -> Firestore mail enqueue for Trigger Email extension
exports.enqueueEmailOnRtdbWrite = r.database
  .ref('/emailQueue/{pushId}')
  .onCreate(async (snapshot, _context) => {
    const payload = snapshot.val();
    if (!payload) return null;

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
      template,
      message: template
        ? undefined
        : {
            subject,
            ...(html ? { html } : { text: text || '' }),
          },
      data,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      source: 'rtdb-enqueueEmailOnRtdbWrite',
      _rtdbRef: snapshot.ref.toString(),
    };

    Object.keys(mailDoc).forEach((k) => mailDoc[k] === undefined && delete mailDoc[k]);

    const db = admin.firestore();
    await db.collection(MAIL_COLLECTION).add(mailDoc);

    await snapshot.ref.update({ processedAt: admin.database.ServerValue.TIMESTAMP });
    return null;
  });

// Callable API to send an appointment email explicitly from the client (e.g., after admin approval)
// data: { apptId: string, status?: 'pending'|'approved'|'declined'|'successful' }
exports.sendAppointmentEmail = r.https.onCall(async (data, context) => {
  try {
    const apptId = data && data.apptId;
    const overrideStatus = data && data.status;
    if (!apptId) {
      throw new functions.https.HttpsError('invalid-argument', 'Missing apptId');
    }
    const snap = await admin.database().ref(`/appointments/${apptId}`).get();
    if (!snap.exists()) {
      throw new functions.https.HttpsError('not-found', 'Appointment not found');
    }
    const rec = snap.val() || {};
    const to = (rec.EMAIL || '').trim();
    if (!to) {
      throw new functions.https.HttpsError('failed-precondition', 'Appointment has no recipient email');
    }
    const payload = { ...rec };
    if (overrideStatus) payload.BOOKING_STATUS = String(overrideStatus).toLowerCase();
    // Build and enqueue email
    const html = buildAppointmentEmailHTML({ ...payload, APPT_ID: rec.APPT_ID || apptId }, { appPublicUrl });
    const subject = buildStatusSubject(payload);
    await enqueueTriggerEmail({ to, subject, html, source: 'callable-sendAppointmentEmail' });
    // Mark flags by status to prevent the RTDB status trigger from double-sending
    const status = String(payload.BOOKING_STATUS || '').toLowerCase();
    const flags = {};
    if (status === 'approved') flags.EMAIL_SENT_APPROVED = true;
    if (status === 'successful') flags.EMAIL_SENT_SUCCESSFUL = true;
    if (status === 'declined') flags.EMAIL_SENT_DECLINED = true;
    if (Object.keys(flags).length) {
      try { await admin.database().ref(`/appointments/${apptId}`).update(flags); } catch (_) {}
    }
    return { ok: true };
  } catch (err) {
    console.error('sendAppointmentEmail failed', err);
    if (err instanceof functions.https.HttpsError) throw err;
    throw new functions.https.HttpsError('internal', err?.message || 'Unknown error');
  }
});
