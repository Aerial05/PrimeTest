import { ref, push, set, update, remove, get } from 'firebase/database';
import BaseFirebaseService from './BaseFirebaseService';
import { app, auth, usersDB } from '/src/config/firebase-config';

class SingleServicesService extends BaseFirebaseService {
  constructor() {
    super({ app, auth, database: usersDB });
    this.basePath = 'singleServices';
    this.archivePath = 'single_service_archives';
  }

  path(id = '') {
    return id ? `${this.basePath}/${id}` : this.basePath;
  }

  async archive(id) {
    // Read the record
    const snap = await get(ref(this.database, this.path(id)));
    if (!snap.exists()) return false;
    const rec = snap.val();
    const now = new Date().toISOString();
    const archivedRec = {
      ...rec,
      IS_ACTIVE_YesNo: 'No',
      ARCHIVED_AT: rec.ARCHIVED_AT && String(rec.ARCHIVED_AT).trim() !== '' ? rec.ARCHIVED_AT : now,
      UPDATED_AT: now,
    };
    await set(ref(this.database, `${this.archivePath}/${id}`), archivedRec);
    await remove(ref(this.database, this.path(id)));
    return true;
  }

  // Map UI payload -> DB record with safe field names
  toDbRecord(ui) {
    const rec = {
      SERVICE_ID: ui.serviceId || '',
      NAME: ui.name || '',
      DESC: ui.description || '',
      SPECIAL_INSTRUCTIONS: ui.specialInstructions || '',
      AVAILABILITY: ui.availability || '',
      SLOT: ui.slot === undefined || ui.slot === '' ? undefined : Number(ui.slot),
      DUR_MINUTE: ui.durMinute === undefined || ui.durMinute === '' ? undefined : Number(ui.durMinute),
      PRICE_NOTE: ui.priceNote || '',
      ORIGINAL_PRICE: ui.originalPrice === undefined || ui.originalPrice === '' ? undefined : Number(ui.originalPrice),
      DISCOUNTED_PRICE: ui.discountedPrice === undefined || ui.discountedPrice === '' ? undefined : Number(ui.discountedPrice),
      PHIL_HEALTH_PROMO_PRICE: ui.philHealthPromoPrice === undefined || ui.philHealthPromoPrice === '' ? undefined : Number(ui.philHealthPromoPrice),
      IS_ACTIVE_YesNo: ui.isActive || 'Yes',
      CREATED_AT: ui.createdAt || new Date().toISOString(),
      UPDATED_AT: new Date().toISOString(),
      ARCHIVED_AT: ui.archivedAt || (ui.isActive === 'No' ? new Date().toISOString() : ''),
    };

    Object.keys(rec).forEach((k) => {
      if (rec[k] === undefined) delete rec[k];
    });
    return rec;
  }

  fromDbRecord(id, db) {
    return { id, ...db };
  }

  async list() {
    const snap = await get(ref(this.database, this.path()));
    if (!snap.exists()) return [];
    const raw = snap.val() || {};
    return Object.entries(raw).map(([id, db]) => this.fromDbRecord(id, db));
  }

  async create(ui) {
    const newRef = push(ref(this.database, this.path()));
    const dbRec = this.toDbRecord(ui);
    // If SERVICE_ID is blank, generate one like SP-<idNum> later in the caller; keep here simple
    await set(newRef, dbRec);
    return newRef.key;
  }

  async update(id, ui) {
    const dbRec = this.toDbRecord(ui);
    await update(ref(this.database, this.path(id)), dbRec);
    return id;
  }

  async remove(id) {
    await remove(ref(this.database, this.path(id)));
    return true;
  }
}

const singleServicesService = new SingleServicesService();
export default singleServicesService;
