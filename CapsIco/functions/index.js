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
const appBrandName = (cfg.app && cfg.app.brand_name) || 'Prime Medical Laboratory';
const appLogoUrl = (cfg.app && cfg.app.logo_url) || '';

const MAIL_COLLECTION = process.env.MAIL_COLLECTION || 'mail';
// Deploy functions in asia-east2
const r = functions.region('asia-east2');

// Helper: resolve service name from RTDB based on SERVICE_TYPE and SERVICE_ID
async function resolveServiceName(rec) {
  const db = admin.database();
  const svcId = String(rec && rec.SERVICE_ID || '').trim();
  const type = String(rec && rec.SERVICE_TYPE || '').toLowerCase();
  if (!svcId) return null;

  // Search helpers with query + full-scan fallbacks to avoid index issues
  const findInSingleServices = async (id) => {
    // Fast path: treat id as key
    try {
      const byKey = await db.ref(`/singleServices/${id}`).get();
      if (byKey.exists() && byKey.val() && byKey.val().NAME) return byKey.val().NAME;
    } catch (_) {}
    // Query by typical fields
    const idFields = ['SERVICE_ID', 'Service_ID', 'ID', 'id', 'SERVICEID'];
    for (const f of idFields) {
      try {
        const q = await db.ref('/singleServices').orderByChild(f).equalTo(id).get();
        if (q.exists()) {
          const first = Object.values(q.val() || {})[0];
          if (first && first.NAME) return first.NAME;
        }
      } catch (_) { /* ignore and try fallback */ }
    }
    // Full-scan fallback (small dataset ok)
    try {
      const all = await db.ref('/singleServices').get();
      if (all.exists()) {
        const obj = all.val() || {};
        for (const key of Object.keys(obj)) {
          const row = obj[key];
          if (!row) continue;
          const candidates = [row.SERVICE_ID, row.Service_ID, row.ID, row.id, row.SERVICEID];
          if (candidates.map(x => String(x || '').trim()).includes(id)) return row.NAME || null;
        }
      }
    } catch (_) {}
    return null;
  };

  const findInServicePackages = async (id) => {
    // Fast path: treat id as key
    try {
      const byKey = await db.ref(`/servicePackages/${id}`).get();
      if (byKey.exists() && byKey.val() && byKey.val().NAME) return byKey.val().NAME;
    } catch (_) {}
    // Query by known id fields (note: SERVICE_PACKGE_ID is the field present in export)
    const idFields = ['SERVICE_PACKGE_ID', 'SERVICE_PACKAGE_ID', 'Service_Package_ID', 'ID', 'id', 'SERVICEPACKAGEID'];
    for (const f of idFields) {
      try {
        const q = await db.ref('/servicePackages').orderByChild(f).equalTo(id).get();
        if (q.exists()) {
          const first = Object.values(q.val() || {})[0];
          if (first && first.NAME) return first.NAME;
        }
      } catch (_) { /* ignore and try fallback */ }
    }
    // Full-scan fallback (small dataset ok)
    try {
      const all = await db.ref('/servicePackages').get();
      if (all.exists()) {
        const obj = all.val() || {};
        for (const key of Object.keys(obj)) {
          const row = obj[key];
          if (!row) continue;
          const candidates = [row.SERVICE_PACKGE_ID, row.SERVICE_PACKAGE_ID, row.Service_Package_ID, row.ID, row.id, row.SERVICEPACKAGEID];
          if (candidates.map(x => String(x || '').trim()).includes(id)) return row.NAME || null;
        }
      }
    } catch (_) {}
    return null;
  };

  try {
    // Prefer the declared type path first, but fall back to the other in case of mismatches
    if (type === 'package') {
      const pkgName = await findInServicePackages(svcId);
      if (pkgName) return pkgName;
      const svcName = await findInSingleServices(svcId);
      if (svcName) return svcName;
    } else { // default to single service first
      const svcName = await findInSingleServices(svcId);
      if (svcName) return svcName;
      const pkgName = await findInServicePackages(svcId);
      if (pkgName) return pkgName;
    }
  } catch (e) {
    console.warn('[resolveServiceName] failed', { err: e && e.message, SERVICE_ID: rec && rec.SERVICE_ID, SERVICE_TYPE: rec && rec.SERVICE_TYPE });
  }
  console.log('[resolveServiceName] name not found', { SERVICE_ID: svcId, SERVICE_TYPE: type });
  return null;
}

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

    // Ensure SERVICE_NAME is populated for emails
    if (!rec.SERVICE_NAME) {
      const resolved = await resolveServiceName(rec);
      if (resolved) {
        rec.SERVICE_NAME = resolved;
        // best-effort write back so future emails have it ready
        try { await admin.database().ref(`/appointments/${apptId}`).update({ SERVICE_NAME: resolved }); } catch (_) {}
      }
    }

    const to = (rec.EMAIL || '').trim();
    if (!to) {
      console.log(`[onAppointmentCreate] No recipient email for ${apptId}`);
      return null;
    }
    const html = buildAppointmentEmailHTML(
      { ...rec, BOOKING_STATUS: (rec.BOOKING_STATUS || 'pending') },
      { appPublicUrl, brandName: appBrandName, logoUrl: appLogoUrl }
    );
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
    // Ensure SERVICE_NAME is populated for emails
    if (!rec.SERVICE_NAME) {
      const resolved = await resolveServiceName(rec);
      if (resolved) {
        rec.SERVICE_NAME = resolved;
        try { await admin.database().ref(`/appointments/${apptId}`).update({ SERVICE_NAME: resolved }); } catch (_) {}
      }
    }
    // Skip if we already sent the approved email
    if (rec.EMAIL_SENT_APPROVED === true) return null;
    const to = (rec.EMAIL || '').trim();
    if (!to) return null;
  rec.BOOKING_STATUS = 'approved';
  const html = buildAppointmentEmailHTML(rec, { appPublicUrl, brandName: appBrandName, logoUrl: appLogoUrl });
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
  const frontRecord = (data && (data.record || data.appointment)) || null;
    const overrideServiceName = (data && data.serviceName) || '';
    const overrideServiceType = (data && data.serviceType) || '';
    const overrideDate = (data && data.date) || '';
    const overrideTime = (data && data.time) || '';
    const overrideServiceId = (data && data.serviceId) || '';
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
    // Merge full record from frontend if provided (admin UI is treated as trusted)
    if (frontRecord && typeof frontRecord === 'object') {
      Object.assign(payload, frontRecord);
    }
    // Apply overrides from client (trusted admin UI)
    if (overrideServiceName) payload.SERVICE_NAME = String(overrideServiceName);
    if (overrideServiceType) payload.SERVICE_TYPE = String(overrideServiceType).toLowerCase();
    if (overrideDate) payload.DATE_OF_APPOINTMENT = String(overrideDate);
    if (overrideTime) payload.TIME_SLOT = String(overrideTime);
    if (overrideServiceId) payload.SERVICE_ID = String(overrideServiceId);
    if (overrideStatus) payload.BOOKING_STATUS = String(overrideStatus).toLowerCase();
    // Ensure SERVICE_NAME is populated
    if (!payload.SERVICE_NAME) {
      const resolved = await resolveServiceName(payload);
      if (resolved) {
        payload.SERVICE_NAME = resolved;
        try { await admin.database().ref(`/appointments/${apptId}`).update({ SERVICE_NAME: resolved }); } catch (_) {}
      }
    }
    // Best-effort persist overrides back to DB for future sends
    const toPersist = {};
    if (overrideServiceName) toPersist.SERVICE_NAME = String(overrideServiceName);
    if (overrideServiceType) toPersist.SERVICE_TYPE = String(overrideServiceType).toLowerCase();
    if (overrideDate) toPersist.DATE_OF_APPOINTMENT = String(overrideDate);
    if (overrideTime) toPersist.TIME_SLOT = String(overrideTime);
    if (overrideServiceId) toPersist.SERVICE_ID = String(overrideServiceId);
    // Persist key fields from frontend record as well
    if (frontRecord && typeof frontRecord === 'object') {
      ['SERVICE_NAME','SERVICE_TYPE','SERVICE_ID','DATE_OF_APPOINTMENT','TIME_SLOT'].forEach((k)=>{
        if (frontRecord[k]) toPersist[k] = frontRecord[k];
      });
    }
    if (Object.keys(toPersist).length) {
      try { await admin.database().ref(`/appointments/${apptId}`).update(toPersist); } catch (_) {}
    }
    // Build and enqueue email
    const html = buildAppointmentEmailHTML(
      { ...payload, APPT_ID: rec.APPT_ID || apptId },
      { appPublicUrl, brandName: appBrandName, logoUrl: appLogoUrl }
    );
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
