import { ref, push, set, update, remove, get } from 'firebase/database';
import BaseFirebaseService from './BaseFirebaseService';
import activityLogService from './ActivityLogService';
import { app, auth, usersDB } from '/src/config/firebase-config';

class ServicePackagesService extends BaseFirebaseService {
  constructor() {
    super({ app, auth, database: usersDB });
    this.basePath = 'servicePackages';
    this.archivePath = 'package_archives';
  }

  path(id = '') {
    return id ? `${this.basePath}/${id}` : this.basePath;
  }

  async getById(id) {
    const snap = await get(ref(this.database, this.path(id)));
    if (!snap.exists()) return null;
    return { id, ...snap.val() };
  }

  async archive(id) {
    // Read the record
    const snap = await get(ref(this.database, this.path(id)));
    if (!snap.exists()) return false;
    const rec = snap.val();
    const now = new Date().toISOString();
    // Ensure archived fields are set
    const archivedRec = {
      ...rec,
      IS_ACTIVE_YesNo: 'No',
      ARCHIVED_AT: rec.ARCHIVED_AT && String(rec.ARCHIVED_AT).trim() !== '' ? rec.ARCHIVED_AT : now,
      UPDATED_AT: now,
    };
    // Write to archive path using same id, then remove original
    await set(ref(this.database, `${this.archivePath}/${id}`), archivedRec);
    await remove(ref(this.database, this.path(id)));
    try {
      await activityLogService.log({
        type: 'service_package',
        action: 'archive',
        description: `Archived service package ${id}`,
        targetId: id,
        targetName: rec?.NAME || '',
      });
    } catch (_) {}
    return true;
  }

  // Map UI payload -> DB record with exact field names
  toDbRecord(ui) {
    const rec = {
      SERVICE_PACKGE_ID: ui.servicePackageId || '',
      NAME: ui.name || '',
      DESC: ui.description || '',
      FEATURES: ui.features || '',
      SPECIAL_INSTRUCTION: ui.specialInstruction || '',
      AVAILABILITY: ui.availability || '',
      SLOT: ui.slot === undefined || ui.slot === '' ? undefined : Number(ui.slot),
      DUR_MINUTE: typeof ui.durMinute === 'number' ? ui.durMinute : Number(ui.durMinute || 0),
      PRICE_NOTE: ui.priceNote || '',
      BOOKING_ENABLED_YesNo: ui.bookingEnabled || 'Yes',
      ORIGINAL_PRICE: ui.originalPrice === undefined || ui.originalPrice === '' ? undefined : Number(ui.originalPrice),
      DISCOUNTED_PRICE: ui.discountedPrice === undefined || ui.discountedPrice === '' ? undefined : Number(ui.discountedPrice),
      PHIL_HEALTH_PROMO_PRICE: ui.philHealthPromoPrice === undefined || ui.philHealthPromoPrice === '' ? undefined : Number(ui.philHealthPromoPrice),
      IS_ACTIVE_YesNo: ui.isActive || 'Yes',
      CREATED_AT: ui.createdAt || new Date().toISOString(),
      UPDATED_AT: new Date().toISOString(),
      ARCHIVED_AT: ui.archivedAt || (ui.isActive === 'No' ? new Date().toISOString() : ''),
    };

    // Remove undefined fields so we don't write null-like values
    Object.keys(rec).forEach((k) => {
      if (rec[k] === undefined) delete rec[k];
    });
    return rec;
  }

  // DB record -> minimal UI mapping (handled more fully in component)
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
    if (!dbRec.SERVICE_PACKGE_ID) {
      dbRec.SERVICE_PACKGE_ID = `PKG-${newRef.key}`;
    }
    await set(newRef, dbRec);
    try {
      await activityLogService.log({
        type: 'service_package',
        action: 'create',
        description: `Created service package ${dbRec.NAME || ''}`,
        targetId: newRef.key,
        targetName: dbRec.NAME || '',
      });
    } catch (_) {}
    return newRef.key;
  }

  async update(id, ui) {
    const dbRec = this.toDbRecord(ui);
    await update(ref(this.database, this.path(id)), dbRec);
    try {
      await activityLogService.log({
        type: 'service_package',
        action: 'update',
        description: `Updated service package ${dbRec.NAME || ''}`,
        targetId: id,
        targetName: dbRec.NAME || '',
      });
    } catch (_) {}
    return id;
  }

  async remove(id) {
    await remove(ref(this.database, this.path(id)));
    try {
      await activityLogService.log({
        type: 'service_package',
        action: 'delete',
        description: `Deleted service package ${id}`,
        targetId: id,
      });
    } catch (_) {}
    return true;
  }
}

const servicePackagesService = new ServicePackagesService();
export default servicePackagesService;
