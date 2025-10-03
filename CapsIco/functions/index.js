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

    return null;
  });
