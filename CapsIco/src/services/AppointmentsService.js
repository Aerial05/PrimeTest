import { ref, push, set, get, runTransaction, update, remove, query, orderByChild, equalTo } from 'firebase/database';
import BaseFirebaseService from './BaseFirebaseService';
import { app, auth, usersDB, storage } from '/src/config/firebase-config';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

// Appointments stored under 'appointments' with UPPER_SNAKE_CASE keys
class AppointmentsService extends BaseFirebaseService {
  constructor() {
    super({ app, auth, database: usersDB });
    this.basePath = 'appointments';
    this.archivePath = 'appointment_archives';
  }

  path(id = '') {
    return id ? `${this.basePath}/${id}` : this.basePath;
  }

  async create(ui) {
    // ui is already normalized by caller to match CSV-like fields
    const newRef = push(ref(this.database, this.path()));
    const now = new Date().toISOString();
    const record = {
      APPT_ID: newRef.key,
      USER_ID: ui.USER_ID || '',
      FIRST_NAME: ui.FIRST_NAME || '',
      LAST_NAME: ui.LAST_NAME || '',
      PHONE: ui.PHONE || '',
      EMAIL: ui.EMAIL || '',
      BIRTHDAY: ui.BIRTHDAY || '',
      GENDER: ui.GENDER || '',
      SERVICE_ID: ui.SERVICE_ID || '',
      SERVICE_TYPE: ui.SERVICE_TYPE || '',
      DATE_OF_APPOINTMENT: ui.DATE_OF_APPOINTMENT || '',
      TIME_SLOT: ui.TIME_SLOT || '',
      SLOT_CAPACITY_REF: ui.SLOT_CAPACITY_REF || '',
      CHIEF_COMPLAINT: ui.CHIEF_COMPLAINT || '',
      SPECIAL_INSTRUCTIONS: ui.SPECIAL_INSTRUCTIONS || '',
  // Default all new appointments to pending; admins will approve manually.
  BOOKING_STATUS: ui.BOOKING_STATUS || 'pending',
      CREATED_AT: ui.CREATED_AT || now,
      UPDATED_AT: ui.UPDATED_AT || now,
    };
    await set(newRef, record);
    return { id: newRef.key, ...record };
  }
  slotCountPath(serviceId, date, time) {
    return `appointmentSlotCounts/${serviceId}/${date}/${time}`;
  }

  bySlotPath(serviceId, date, time, apptId) {
    return `appointmentsBySlot/${serviceId}/${date}/${time}/${apptId}`;
  }

  async reserveSlot(serviceId, date, time, capacity = 1) {
    const path = this.slotCountPath(serviceId, date, time);
    const res = await runTransaction(ref(this.database, path), (current) => {
      const curr = typeof current === 'number' ? current : 0;
      if (curr >= capacity) return; // abort
      return curr + 1;
    });
    return res.committed && typeof res.snapshot.val() === 'number';
  }

  async releaseSlot(serviceId, date, time) {
    const path = this.slotCountPath(serviceId, date, time);
    await runTransaction(ref(this.database, path), (current) => {
      const curr = typeof current === 'number' ? current : 0;
      const next = curr - 1;
      return next <= 0 ? null : next; // remove when zero
    });
  }

  async indexAppointmentBySlot(serviceId, date, time, apptId) {
    await set(ref(this.database, this.bySlotPath(serviceId, date, time, apptId)), true);
  }

  async getById(id) {
    const snap = await get(ref(this.database, this.path(id)));
    if (!snap.exists()) return null;
    return { id, ...snap.val() };
  }

  async list() {
    const snap = await get(ref(this.database, this.path()));
    if (!snap.exists()) return [];
    const obj = snap.val() || {};
    const rows = Object.keys(obj).map((id) => ({ id, ...obj[id] }));
    // Sort newest first by CREATED_AT, fallback to id
    rows.sort((a, b) => String(b.CREATED_AT || '').localeCompare(String(a.CREATED_AT || '')) || String(b.id).localeCompare(String(a.id)));
    return rows;
  }

  async listByUser(userId) {
    if (!userId) return [];
    try {
      const q = query(ref(this.database, this.basePath), orderByChild('USER_ID'), equalTo(userId));
      const snap = await get(q);
      if (!snap.exists()) return [];
      const obj = snap.val() || {};
      const rows = Object.keys(obj).map((id) => ({ id, ...obj[id] }));
      rows.sort((a, b) =>
        String(b.CREATED_AT || '').localeCompare(String(a.CREATED_AT || '')) ||
        String(b.id).localeCompare(String(a.id))
      );
      return rows;
    } catch (_err) {
      // Fallback: read all appointments and filter client-side
      const snap = await get(ref(this.database, this.basePath));
      if (!snap.exists()) return [];
      const obj = snap.val() || {};
      const rows = Object.keys(obj)
        .map((id) => ({ id, ...obj[id] }))
        .filter((row) => String(row.USER_ID || '') === String(userId));
      rows.sort((a, b) =>
        String(b.CREATED_AT || '').localeCompare(String(a.CREATED_AT || '')) ||
        String(b.id).localeCompare(String(a.id))
      );
      return rows;
    }
  }

  async updateStatus(id, status) {
    const now = new Date().toISOString();
    await update(ref(this.database, this.path(id)), { BOOKING_STATUS: String(status || '').toLowerCase(), UPDATED_AT: now });
  }

  async delete(id) {
    const appt = await this.getById(id);
    if (!appt) return false;
    // Remove the appointment record
    await remove(ref(this.database, this.path(id)));
    // Best-effort: release the reserved slot and remove slot index
    try {
      if (appt.SERVICE_ID && appt.DATE_OF_APPOINTMENT && appt.TIME_SLOT) {
        await this.releaseSlot(appt.SERVICE_ID, appt.DATE_OF_APPOINTMENT, appt.TIME_SLOT);
        await remove(ref(this.database, this.bySlotPath(appt.SERVICE_ID, appt.DATE_OF_APPOINTMENT, appt.TIME_SLOT, id)));
      }
    } catch (_e) {}
    return true;
  }

  /**
   * Upload a proof image for an appointment and persist its URL under PROOF.
   * Expects FormData with field name 'proof' containing a File/Blob.
   * Returns { url } on success.
   */
  async uploadProof(id, formData, onProgress) {
    if (!id) throw new Error('Missing appointment id');
    if (!formData || typeof formData.get !== 'function') throw new Error('FormData is required');
    const file = formData.get('proof');
    if (!file) throw new Error('No file provided in field "proof"');
    // Build a deterministic storage path
    const fileName = (file.name || 'proof').replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = `proofs/${id}/${Date.now()}_${fileName}`;
    const sRef = storageRef(storage, path);
  const metadata = file.type ? { contentType: file.type } : {};
  const task = uploadBytesResumable(sRef, file, metadata);
    await new Promise((resolve, reject) => {
      task.on('state_changed', (snapshot) => {
        if (typeof onProgress === 'function' && snapshot.totalBytes > 0) {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          try { onProgress(pct); } catch (_) {}
        }
      }, (err) => reject(err), () => resolve());
    });
    const url = await getDownloadURL(task.snapshot.ref);
    const now = new Date().toISOString();
    await update(ref(this.database, this.path(id)), { PROOF: url, UPDATED_AT: now });
    return { url };
  }

  async archive(id) {
    // Read the original
    const snap = await get(ref(this.database, this.path(id)));
    if (!snap.exists()) return false;
    const rec = snap.val() || {};
    const now = new Date().toISOString();
    const archivedRec = {
      ...rec,
      BOOKING_STATUS: rec.BOOKING_STATUS || 'pending',
      ARCHIVED_AT: rec.ARCHIVED_AT && String(rec.ARCHIVED_AT).trim() !== '' ? rec.ARCHIVED_AT : now,
      UPDATED_AT: now,
    };

    // Write to archive path and remove the original
    await set(ref(this.database, `${this.archivePath}/${id}`), archivedRec);
    await remove(ref(this.database, this.path(id)));

    // Best-effort slot cleanup
    try {
      if (rec.SERVICE_ID && rec.DATE_OF_APPOINTMENT && rec.TIME_SLOT) {
        await this.releaseSlot(rec.SERVICE_ID, rec.DATE_OF_APPOINTMENT, rec.TIME_SLOT);
        await remove(ref(this.database, this.bySlotPath(rec.SERVICE_ID, rec.DATE_OF_APPOINTMENT, rec.TIME_SLOT, id)));
      }
    } catch (_e) {}
    return true;
  }

  /**
   * Add a one-time feedback to an appointment. Allowed only when appointment
   * is completed/successful and has a PROOF uploaded. Uses a transaction to
   * guarantee single submission and validates rating bounds (1-5).
   *
   * payload: {
   *   message?: string,
   *   ratings: {
   *     bookingEase?: number,
   *     speed?: number,
   *     staff?: number,
   *     cleanliness?: number,
   *     overall?: number
   *   }
   * }
   */
  async addFeedback(id, payload = {}, userId = '') {
    if (!id) throw new Error('Missing appointment id');
    const now = new Date().toISOString();
    const normalizeStar = (v) => {
      const n = Number(v);
      if (!Number.isFinite(n)) return undefined;
      if (n < 1) return 1;
      if (n > 5) return 5;
      return Math.round(n);
    };

    const ratings = payload.ratings || {};
    const normalizedRatings = {
      bookingEase: normalizeStar(ratings.bookingEase),
      speed: normalizeStar(ratings.speed),
      staff: normalizeStar(ratings.staff),
      cleanliness: normalizeStar(ratings.cleanliness),
      overall: normalizeStar(ratings.overall),
    };

    // Remove undefined keys to keep DB clean
    Object.keys(normalizedRatings).forEach((k) => {
      if (typeof normalizedRatings[k] === 'undefined' || normalizedRatings[k] === null) {
        delete normalizedRatings[k];
      }
    });

    // Require at least one rating
    if (Object.keys(normalizedRatings).length === 0) {
      throw new Error('Please provide at least one rating');
    }

    const res = await runTransaction(ref(this.database, this.path(id)), (current) => {
      if (!current) return; // abort if missing
      const status = String(current.BOOKING_STATUS || '').toLowerCase();
      const statusOk = status.startsWith('complete') || status.startsWith('success');
      const hasProof = !!current.PROOF;
      if (!statusOk || !hasProof) return; // abort if not eligible
      if (current.FEEDBACK) return; // abort if already submitted

      const feedback = {
        message: String(payload.message || '').slice(0, 2000),
        ratings: normalizedRatings,
        createdAt: now,
        userId: userId || (current.USER_ID || ''),
        appointmentId: current.APPT_ID || id,
        feedbackId: `${id}__${userId || (current.USER_ID || '')}`,
      };
      return { ...current, FEEDBACK: feedback, UPDATED_AT: now };
    });

    if (!res.committed) {
      // Determine reason by inspecting snapshot when available
      const val = res.snapshot ? res.snapshot.val() : null;
      const status = val ? String(val.BOOKING_STATUS || '').toLowerCase() : '';
      const hasProof = !!(val && val.PROOF);
      if (val && val.FEEDBACK) throw new Error('Feedback already submitted for this appointment');
      if (!hasProof) throw new Error('Feedback allowed only after proof is uploaded');
      if (!(status.startsWith('complete') || status.startsWith('success'))) {
        throw new Error('Feedback allowed only for completed appointments');
      }
      throw new Error('Unable to submit feedback. Please try again.');
    }

    const saved = res.snapshot.val();
    const fb = saved && saved.FEEDBACK ? saved.FEEDBACK : null;
    if (fb) {
      // Write secondary indices for easier querying
      const indexRecord = {
        ...fb,
        APPT_ID: id,
        USER_ID: fb.userId || userId || '',
      };
      const updates = {};
      updates[`feedbacks/${id}`] = indexRecord; // one-to-one by appointment
      updates[`feedbackByAppointment/${id}`] = indexRecord; // alias for clarity
      if (indexRecord.USER_ID) {
        updates[`feedbackByUser/${indexRecord.USER_ID}/${id}`] = indexRecord;
      }
      try {
        await update(ref(this.database), updates);
      } catch (_e) {
        // Non-fatal: primary FEEDBACK is already saved under appointment
      }
    }
    return fb;
  }
}

const appointmentsService = new AppointmentsService();
export default appointmentsService;
