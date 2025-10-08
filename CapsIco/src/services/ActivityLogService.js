import { ref, push, set, update, get } from 'firebase/database';
import { app, auth, usersDB } from '/src/config/firebase-config';
import BaseFirebaseService from './BaseFirebaseService';
import authService from './AuthService';

/**
 * Admin Activity Log Service
 * Writes admin actions to Realtime DB under:
 *  - adminActivityLogs/{logId}
 *  - adminActivityByUser/{uid}/{logId}
 * Each log: {
 *   id, type, action, description, targetId, targetName,
 *   actor: { uid, displayName, email }, actorRole, createdAt, createdAtMs,
 *   metadata?: object
 * }
 */
export class ActivityLogService extends BaseFirebaseService {
  constructor() {
    super({ app, auth, database: usersDB });
    this.basePath = 'adminActivityLogs';
  }

  path(id = '') {
    return id ? `${this.basePath}/${id}` : this.basePath;
  }

  async currentActor() {
    const user = this.auth.currentUser;
    if (!user) return null;
    const role = await authService.getUserRole(user).catch(() => 'user');
    return {
      uid: user.uid,
      displayName: authService.getDisplayName(user) || user.email || 'Unknown',
      email: user.email || '',
      role,
    };
  }

  /**
   * Log an activity if the current actor is an admin.
   * fields: { type, action, description?, targetId?, targetName?, metadata? }
   */
  async log(fields = {}) {
    const actor = await this.currentActor();
    if (!actor) return null;
    // Only log admin actions
    if (actor.role !== 'admin') return null;

    const now = new Date();
    const createdAt = now.toISOString();
    const createdAtMs = now.getTime();
    const logRef = push(ref(this.database, this.basePath));
    const id = logRef.key;
    const record = {
      id,
      type: String(fields.type || '').trim() || 'general',
      action: String(fields.action || '').trim() || 'unknown',
      description: String(fields.description || ''),
      targetId: fields.targetId || '',
      targetName: fields.targetName || '',
      actor: { uid: actor.uid, displayName: actor.displayName, email: actor.email },
      actorRole: actor.role,
      createdAt,
      createdAtMs,
    };
    if (fields.metadata && typeof fields.metadata === 'object') {
      record.metadata = fields.metadata;
    }
    await set(logRef, record);
    try {
      if (actor.uid) {
        await set(ref(this.database, `adminActivityByUser/${actor.uid}/${id}`), record);
      }
    } catch (_) {}
    return record;
  }

  async markOutcome(id, { success, errorMessage } = {}) {
    const updates = {};
    if (typeof success === 'boolean') updates.success = success;
    if (errorMessage) updates.errorMessage = String(errorMessage);
    if (Object.keys(updates).length === 0) return;
    await update(ref(this.database, this.path(id)), updates);
  }
}

const activityLogService = new ActivityLogService();
export default activityLogService;
