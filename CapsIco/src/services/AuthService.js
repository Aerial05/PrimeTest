import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  createUserWithEmailAndPassword,
  updateProfile,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  signInWithEmailAndPassword,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  fetchSignInMethodsForEmail,
  sendPasswordResetEmail,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { ref, set, update, get, query, orderByChild, equalTo } from 'firebase/database';
import { app, auth, usersDB } from '/src/config/firebase-config';
import BaseFirebaseService from './BaseFirebaseService';

class AuthProviderStrategy {
  constructor(service) {
    this.service = service;
  }

  // eslint-disable-next-line class-methods-use-this
  async signIn() {
    throw new Error('signIn is not implemented');
  }
}

class EmailPasswordStrategy extends AuthProviderStrategy {
  async signIn({ email, password, remember }) {
    await this.service.applyPersistence(remember);
    const cred = await signInWithEmailAndPassword(this.service.auth, email, password);
    return cred.user;
  }
}

class GoogleAuthStrategy extends AuthProviderStrategy {
  async signIn({ remember }) {
    await this.service.applyPersistence(remember);
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(this.service.auth, provider);
    return cred.user;
  }
}

class FacebookAuthStrategy extends AuthProviderStrategy {
  async signIn({ remember }) {
    await this.service.applyPersistence(remember);
    const provider = new FacebookAuthProvider();
    provider.addScope('public_profile');
    provider.addScope('email');
    provider.setCustomParameters({ display: 'popup' });
    const cred = await signInWithPopup(this.service.auth, provider);
    return cred.user;
  }
}

const providerLabel = (method) => {
  switch (method) {
    case 'google.com':
      return 'Google';
    case 'facebook.com':
      return 'Facebook';
    case 'password':
      return 'Email & Password';
    default:
      return method;
  }
};

const ADMIN_EMAILS = ['tamayoangelico@gmail.com'];

export class AuthService extends BaseFirebaseService {
  constructor() {
    super({ app, auth, database: usersDB });
    this.ADMIN_EMAILS = ADMIN_EMAILS.map((email) => email.toLowerCase());
    this.providers = {
      email: new EmailPasswordStrategy(this),
      google: new GoogleAuthStrategy(this),
      facebook: new FacebookAuthStrategy(this),
    };
  }

  get currentUser() {
    return this.auth.currentUser;
  }

  getDisplayName(user = this.currentUser) {
    if (!user) return '';
    return user.displayName || (user.email ? user.email.split('@')[0] : '');
  }

  async applyPersistence(remember) {
    await setPersistence(
      this.auth,
      remember ? browserLocalPersistence : browserSessionPersistence
    );
  }

  async signInWithEmail({ email, password, remember }) {
    const user = await this.providers.email.signIn({ email, password, remember });
    await this.afterSignIn(user);
    return user;
  }

  async signInWithProvider(provider, options = {}) {
    const strategy = this.providers[provider];
    if (!strategy) {
      throw new Error(`Unsupported auth provider: ${provider}`);
    }
    const user = await strategy.signIn(options);
    await this.afterSignIn(user);
    return user;
  }

  async registerUser({
    firstName,
    middleName,
    lastName,
    username,
    phoneE164,
    email,
    password,
  }) {
    const trimmedEmail = (email || '').trim();
    const normalizedEmail = trimmedEmail.toLowerCase();
    const cred = await createUserWithEmailAndPassword(this.auth, trimmedEmail, password);
    const displayName = username || `${firstName} ${lastName}`.trim();
    if (displayName) {
      await updateProfile(cred.user, { displayName });
    }

    const uid = cred.user.uid;
    const createdAt = cred.user.metadata?.creationTime || new Date().toISOString();
    await set(ref(this.database, `users/${uid}`), {
      firstName,
      middleName,
      lastName,
      username,
      phone: phoneE164,
      email: trimmedEmail,
      emailLower: normalizedEmail,
      role: this.isAdminEmail(trimmedEmail) ? 'admin' : 'user',
      joinedAt: createdAt,
      createdAt,
      updatedAt: createdAt,
    });

    if (username) {
      await set(ref(this.database, `usernames/${username}`), trimmedEmail);
      await update(ref(this.database, `usersByUsername/${username}`), { email: trimmedEmail });
    }

    await this.ensureUserRecord(cred.user);
    return cred.user;
  }

  async changePassword(currentPassword, newPassword) {
    const user = this.currentUser;
    if (!user) throw new Error('Not authenticated');

    const hasPasswordProvider = (user.providerData || []).some(
      (p) => p.providerId === 'password'
    );
    if (!hasPasswordProvider) {
      throw new Error('This account does not use a password.');
    }
    if (!user.email) {
      throw new Error('Current user has no email.');
    }
    if (!currentPassword) {
      throw new Error('Please enter your current password.');
    }
    if (!newPassword || newPassword.length < 6) {
      throw new Error('New password must be at least 6 characters.');
    }

    try {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
    } catch (e) {
      if (e?.code === 'auth/wrong-password') {
        throw new Error('Current password is incorrect.');
      }
      if (e?.code === 'auth/too-many-requests') {
        throw new Error('Too many attempts. Please try again later.');
      }
      if (e?.code === 'auth/user-mismatch' || e?.code === 'auth/user-not-found') {
        throw new Error('User session mismatch. Please re-login.');
      }
      if (e?.code === 'auth/requires-recent-login') {
        throw new Error('Please re-login to change your password.');
      }
      throw e;
    }

    try {
      await updatePassword(user, newPassword);
    } catch (e) {
      if (e?.code === 'auth/weak-password') {
        throw new Error('New password is too weak.');
      }
      if (e?.code === 'auth/requires-recent-login') {
        throw new Error('Please re-login to change your password.');
      }
      throw e;
    }
  }

  async signOut() {
    await firebaseSignOut(this.auth);
  }

  isAdminEmail(email) {
    if (!email) return false;
    return this.ADMIN_EMAILS.includes(email.toLowerCase());
  }

  async afterSignIn(user) {
    if (!user) return user;
    await this.ensureUserRecord(user);
    return user;
  }

  async ensureUserRecord(user) {
    if (!user) return;
    const email = (user.email || '').trim();
    const normalizedEmail = email.toLowerCase();
    const updates = {
      email,
      emailLower: normalizedEmail,
      displayName: user.displayName || '',
      lastLoginAt: new Date().toISOString(),
    };

    if (this.isAdminEmail(email)) {
      updates.role = 'admin';
    }

    await update(ref(this.database, `users/${user.uid}`), updates);
  }

  async isAdmin(user = this.currentUser) {
    if (!user) return false;
    const email = (user.email || '').trim();
    if (this.isAdminEmail(email)) return true;
    const role = await this.getUserRole(user);
    return role === 'admin';
  }

  async getUserRole(user = this.currentUser) {
    if (!user) return null;
    try {
      const snap = await get(ref(this.database, `users/${user.uid}/role`));
      if (snap.exists()) {
        return snap.val();
      }
    } catch (err) {
      console.warn('Failed to load user role', err);
    }
    const email = (user.email || '').trim();
    return this.isAdminEmail(email) ? 'admin' : null;
  }

  async sendPasswordReset(identifier) {
    const id = (identifier || '').trim();
    if (!id) throw new Error('Please enter your email or username.');

    let emailToUse = '';
    if (id.includes('@')) {
      emailToUse = id.trim();
    } else {
      emailToUse = await this.resolveEmailFromUsername(id);
      if (!emailToUse) {
        throw new Error('Username not found.');
      }
    }

    emailToUse = emailToUse.trim();

    const methods = await fetchSignInMethodsForEmail(this.auth, emailToUse);
    if (!methods || methods.length === 0) {
      throw new Error('No account found for that email.');
    }

    if (!methods.includes('password')) {
      const providerList = methods.map(providerLabel).join(', ');
      throw new Error(
        'This account signs in with ' +
          providerList +
          '. Use that option from the login screen or set a password first.'
      );
    }

    await sendPasswordResetEmail(this.auth, emailToUse);
    return 'Password reset email sent. Check your inbox.';
  }

  async resolveEmailFromUsername(rawUsername) {
    const username = (rawUsername || '').trim();
    if (!username) return '';

    const candidates = Array.from(new Set([username, username.toLowerCase()]));

    for (const candidate of candidates) {
      const candidatePaths = [
        `usernames/${candidate}`,
        `usersByUsername/${candidate}/email`,
        `users/${candidate}/email`,
      ];

      for (const path of candidatePaths) {
        // eslint-disable-next-line no-await-in-loop
        const snap = await get(ref(this.database, path));
        if (snap.exists()) {
          const val = snap.val();
          const email = typeof val === 'string' ? val : val?.email;
          if (typeof email === 'string' && email.trim()) {
            return email.trim();
          }
        }
      }

      const userQuery = query(
        ref(this.database, 'users'),
        orderByChild('username'),
        equalTo(candidate)
      );
      // eslint-disable-next-line no-await-in-loop
      const resultSnap = await get(userQuery);
      if (resultSnap.exists()) {
        const found = Object.values(resultSnap.val() || {}).find((entry) => {
          if (!entry) return false;
          const entryUsername =
            typeof entry.username === 'string' ? entry.username.trim() : '';
          return (
            entryUsername && entryUsername.toLowerCase() === candidate.toLowerCase()
          );
        });
        if (found) {
          const email =
            typeof found.email === 'string'
              ? found.email.trim()
              : typeof found.emailLower === 'string'
              ? found.emailLower.trim()
              : '';
          if (email) {
            return email;
          }
        }
      }

      // eslint-disable-next-line no-await-in-loop
      const allUsersSnap = await get(ref(this.database, 'users'));
      if (allUsersSnap.exists()) {
        const records = allUsersSnap.val() || {};
        for (const entry of Object.values(records)) {
          if (!entry) continue;
          const entryUsername =
            typeof entry.username === 'string' ? entry.username.trim() : '';
          if (entryUsername && entryUsername.toLowerCase() === candidate.toLowerCase()) {
            const email =
              typeof entry.email === 'string'
                ? entry.email.trim()
                : typeof entry.emailLower === 'string'
                ? entry.emailLower.trim()
                : '';
            if (email) {
              return email;
            }
          }
        }
      }
    }

    return '';
  }
}

const authService = new AuthService();
export default authService;
