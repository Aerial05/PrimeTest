import { ref, push, set, get, runTransaction, update, remove } from 'firebase/database';
import BaseFirebaseService from './BaseFirebaseService';
import { app, auth, usersDB } from '/src/config/firebase-config';

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
  // Auto-approve new appointments by default (temporary policy)
  BOOKING_STATUS: ui.BOOKING_STATUS || 'approved',
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
}

const appointmentsService = new AppointmentsService();
export default appointmentsService;
