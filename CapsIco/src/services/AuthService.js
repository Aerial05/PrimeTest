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
  RecaptchaVerifier,
  signInWithPhoneNumber,
  linkWithPhoneNumber,
  PhoneAuthProvider,
  updatePhoneNumber,
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

// Admin detection is now driven solely by Realtime DB (users/{uid}/role === 'admin').
// Leave allowlist empty to avoid hardcoded admins.
const ADMIN_EMAILS = [];

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

  // Allow users to sign in with either email or username
  async signInWithIdentifier({ identifier, password, remember }) {
    const id = (identifier || '').trim();
    if (!id) throw new Error('Please enter your email or username.');
    let emailToUse = '';
    if (id.includes('@')) {
      emailToUse = id;
    } else {
      emailToUse = await this.resolveEmailFromUsername(id);
      if (!emailToUse) throw new Error('Username not found.');
    }
    const user = await this.providers.email.signIn({ email: emailToUse, password, remember });
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

  // ---- Phone Number Sign-in (OTP) helpers ----
  // Creates (or reuses) an invisible reCAPTCHA verifier bound to a button/container ID.
  // elementId: DOM id of the button or container; options: { size?: 'invisible'|'normal'|'compact', callback?: fn, 'expired-callback'?: fn }
  getOrCreateRecaptchaVerifier(elementId = 'sign-in-button', options = {}) {
    if (typeof window === 'undefined') {
      throw new Error('reCAPTCHA is only available in the browser');
    }
    const size = options.size || 'invisible';
    if (!window.__recaptchaVerifiers) window.__recaptchaVerifiers = {};
    if (window.__recaptchaVerifiers[elementId]) {
      return window.__recaptchaVerifiers[elementId];
    }
    // Ensure a stable container exists in DOM (prefer a DIV)
    let container = document.getElementById(elementId);
    if (!container) {
      container = document.createElement('div');
      container.id = elementId;
      // Keep it offscreen but in DOM for invisible mode
      container.style.position = 'fixed';
      container.style.left = '-9999px';
      container.style.bottom = '0';
      document.body.appendChild(container);
    }
    const verifier = new RecaptchaVerifier(this.auth, elementId, {
      size,
      callback: options.callback,
      'expired-callback': options['expired-callback'],
    });
    window.__recaptchaVerifiers[elementId] = verifier;
    return verifier;
  }

  async renderRecaptcha(verifier) {
    if (!verifier) throw new Error('Missing reCAPTCHA verifier');
    const widgetId = await verifier.render();
    if (typeof window !== 'undefined') {
      window.recaptchaWidgetId = widgetId;
    }
    return widgetId;
  }

  resetRecaptcha(verifier) {
    if (!verifier) return;
    try {
      if (typeof window !== 'undefined' && window.grecaptcha) {
        if (typeof window.recaptchaWidgetId === 'number') {
          window.grecaptcha.reset(window.recaptchaWidgetId);
        } else {
          verifier.render().then((id) => window.grecaptcha.reset(id));
        }
      }
    } catch (_) {
      // ignore
    }
  }

  // Starts phone sign-in by sending an SMS. Returns the ConfirmationResult to be used with confirm(code).
  // phoneE164 should be like +639XXXXXXXXX
  async startPhoneSignIn(phoneE164, elementId = 'sign-in-button', options = {}) {
    if (!phoneE164 || !/^\+\d{8,15}$/.test(phoneE164)) {
      throw new Error('Please enter a valid phone number in international format');
    }
    const verifier = this.getOrCreateRecaptchaVerifier(elementId, options);
    // Make sure it's rendered (especially for visible widgets)
    try { await this.renderRecaptcha(verifier); } catch (_) {}
    try {
      // Ensure token is generated/valid prior to sending
      try { await verifier.verify(); } catch (_) {}
      const confirmationResult = await signInWithPhoneNumber(this.auth, phoneE164, verifier);
      if (typeof window !== 'undefined') {
        window.confirmationResult = confirmationResult;
      }
      return confirmationResult;
    } catch (error) {
      // Reset reCAPTCHA so the user can try again
      this.resetRecaptcha(verifier);
      if (error && error.code === 'auth/too-many-requests') {
        const wrapped = new Error('Too many attempts. Please wait a few minutes before trying again, or use a different phone number. For development, use a test phone number configured in Firebase.');
        wrapped.code = error.code;
        throw wrapped;
      }
      if (error && (error.code === 'auth/invalid-app-credential' || error.message?.includes('invalid-app-credential'))) {
        const host = typeof window !== 'undefined' ? window.location.origin : '';
        const hint = 'Phone auth failed due to app credential validation. Make sure your current origin is in Firebase Authentication > Settings > Authorized domains, your API key is not blocked by HTTP referrer restrictions for this origin, and App Check is disabled for web or properly configured. Avoid localhost; use 127.0.0.1 or a public dev domain.';
        const wrapped = new Error(`${hint}${host ? ` Current origin: ${host}` : ''}`);
        wrapped.code = error.code;
        throw wrapped;
      }
      throw error;
    }
  }

  // Completes phone sign-in with the 6-digit code. Accepts either the code string or a ConfirmationResult.
  async confirmPhoneCode(code, confirmationResult) {
    const result = await (confirmationResult || (typeof window !== 'undefined' && window.confirmationResult))?.confirm(code);
    if (!result) throw new Error('Invalid or expired confirmation session. Please try again.');
    const user = result.user;
    await this.afterSignIn(user);
    return user;
  }

  // Start linking a phone number to the currently signed-in user (for profile verification)
  async startLinkPhone(phoneE164, elementId = 'profile-phone-recaptcha', options = {}) {
    if (!phoneE164 || !/^\+\d{8,15}$/.test(phoneE164)) {
      throw new Error('Please enter a valid phone number in international format');
    }
    const user = this.currentUser;
    if (!user) throw new Error('You must be logged in to verify your phone');

    // Enforce uniqueness in our DB before attempting to link in Auth
    try {
      const matches = await this.findUsersByPhone(phoneE164);
      if (matches.length > 0) {
        const other = matches.find((m) => m.uid !== user.uid);
        if (other) {
          throw new Error('This phone number is already associated with another account. Please use a different number or contact support.');
        }
        const selfMatch = matches.find((m) => m.uid === user.uid);
        if (selfMatch?.record?.phoneVerified) {
          throw new Error('This phone number is already verified on your account.');
        }
      }
    } catch (e) {
      if (e?.message) throw e;
      // fallthrough on non-fatal DB issues
    }
    const verifier = this.getOrCreateRecaptchaVerifier(elementId, options);
    try { await this.renderRecaptcha(verifier); } catch (_) {}
    try {
      try { await verifier.verify(); } catch (_) {}
      const confirmationResult = await linkWithPhoneNumber(user, phoneE164, verifier);
      if (typeof window !== 'undefined') {
        window.confirmationResult = confirmationResult;
      }
      return confirmationResult;
    } catch (error) {
      this.resetRecaptcha(verifier);
      throw error;
    }
  }

  async confirmLinkPhone(code, confirmationResult) {
    const result = await (confirmationResult || (typeof window !== 'undefined' && window.confirmationResult))?.confirm(code);
    if (!result) throw new Error('Invalid or expired confirmation session. Please try again.');
    const user = result.user;
    // after linking, ensure user record exists/updated
    await this.afterSignIn(user);
    return user;
  }

  // Re-authenticate current user using an OTP sent to their existing phone number
  async startReauthPhone(phoneE164, elementId = 'change-phone-reauth-recaptcha', options = {}) {
    if (!phoneE164 || !/^\+\d{8,15}$/.test(phoneE164)) {
      throw new Error('Please enter a valid phone number in international format');
    }
    const user = this.currentUser;
    if (!user) throw new Error('You must be logged in to continue');
    const verifier = this.getOrCreateRecaptchaVerifier(elementId, options);
    try { await this.renderRecaptcha(verifier); } catch (_) {}
    try {
      try { await verifier.verify(); } catch (_) {}
      const provider = new PhoneAuthProvider(this.auth);
      const verificationId = await provider.verifyPhoneNumber(phoneE164, verifier);
      if (typeof window !== 'undefined') {
        window.__reauthPhoneVerificationId = verificationId;
      }
      return verificationId;
    } catch (error) {
      this.resetRecaptcha(verifier);
      throw error;
    }
  }

  async confirmReauthPhone(code) {
    const user = this.currentUser;
    if (!user) throw new Error('No active session');
    const verificationId = (typeof window !== 'undefined' && window.__reauthPhoneVerificationId) || null;
    if (!verificationId) throw new Error('No re-authentication session found. Please request a new code.');
    const cred = PhoneAuthProvider.credential(verificationId, code);
    await reauthenticateWithCredential(user, cred);
    return true;
  }

  // Start verification to update the user's phone number to a new one
  async startUpdatePhone(newPhoneE164, elementId = 'change-phone-new-recaptcha', options = {}) {
    if (!newPhoneE164 || !/^\+\d{8,15}$/.test(newPhoneE164)) {
      throw new Error('Please enter a valid phone number in international format');
    }
    const user = this.currentUser;
    if (!user) throw new Error('You must be logged in to continue');
    const verifier = this.getOrCreateRecaptchaVerifier(elementId, options);
    try { await this.renderRecaptcha(verifier); } catch (_) {}
    try {
      try { await verifier.verify(); } catch (_) {}
      const provider = new PhoneAuthProvider(this.auth);
      const verificationId = await provider.verifyPhoneNumber(newPhoneE164, verifier);
      if (typeof window !== 'undefined') {
        window.__updatePhoneVerificationId = verificationId;
      }
      return verificationId;
    } catch (error) {
      this.resetRecaptcha(verifier);
      throw error;
    }
  }

  async confirmUpdatePhone(code) {
    const user = this.currentUser;
    if (!user) throw new Error('No active session');
    const verificationId = (typeof window !== 'undefined' && window.__updatePhoneVerificationId) || null;
    if (!verificationId) throw new Error('No update session found. Please request a new code.');
    const cred = PhoneAuthProvider.credential(verificationId, code);
    await updatePhoneNumber(user, cred);
    await this.afterSignIn(user);
    return user;
  }

  // Look up a user record by phone number and return {uid, record}
  async findUserByPhone(phoneE164) {
    const q = query(ref(this.database, 'users'), orderByChild('phone'), equalTo(phoneE164));
    const snap = await get(q);
    if (!snap.exists()) return null;
    const obj = snap.val() || {};
    const [uid, record] = Object.entries(obj)[0] || [];
    if (!uid) return null;
    return { uid, record };
  }

  // Find all user records with the given phone number. Returns an array of { uid, record }.
  async findUsersByPhone(phoneE164) {
    const q = query(ref(this.database, 'users'), orderByChild('phone'), equalTo(phoneE164));
    const snap = await get(q);
    if (!snap.exists()) return [];
    const obj = snap.val() || {};
    return Object.entries(obj).map(([uid, record]) => ({ uid, record }));
  }

  // Ensure the phone exists and is marked verified in DB before allowing OTP login
  async assertVerifiedPhoneForLogin(phoneE164) {
    if (!/^\+63\d{10}$/.test(phoneE164)) {
      throw new Error('Phone login is available for PH (+63) numbers only.');
    }
    const matches = await this.findUsersByPhone(phoneE164);
    if (!matches || matches.length === 0) {
      throw new Error('No account found with this phone. Log in with email, add your PH number in Profile, and verify it first.');
    }
    if (matches.length > 1) {
      throw new Error('This phone number is associated with multiple accounts. Please contact support to resolve it before using OTP login.');
    }
    const found = matches[0];
    const verified = !!found.record?.phoneVerified;
    if (!verified) {
      throw new Error('Phone not verified. Please verify your PH number in your Profile before using OTP login.');
    }
    return found;
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
    // Validate phone (PH only) and enforce uniqueness before creating auth user
    const normalizedPhone = (phoneE164 || '').trim();
    if (normalizedPhone) {
      if (!/^\+63\d{10}$/.test(normalizedPhone)) {
        throw new Error('Enter a valid PH number in +63 format');
      }
      const existing = await this.findUsersByPhone(normalizedPhone);
      if (existing && existing.length > 0) {
        throw new Error('This phone number is already associated with another account.');
      }
    }

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
      phoneVerified: false,
      email: trimmedEmail,
      emailLower: normalizedEmail,
      // Default all new accounts to 'user'; elevate via DB role management
      role: 'user',
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
    if (typeof window !== 'undefined') {
      localStorage.removeItem('preferredDashboard');
    }
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

    await update(ref(this.database, `users/${user.uid}`), updates);
  }

  async isAdmin(user = this.currentUser) {
    if (!user) return false;
    const role = await this.getUserRole(user);
    return role === 'admin';
  }

  async getUserRole(user = this.currentUser) {
    if (!user) return null;
    try {
      const snap = await get(ref(this.database, `users/${user.uid}/role`));
      if (snap.exists()) {
        const raw = snap.val();
        const s = (raw == null ? '' : String(raw)).trim().toLowerCase();
        if (s === 'admin' || s === 'super admin' || s === 'super_admin' || s === 'superadmin') {
          return 'admin';
        }
        return 'user';
      }
    } catch (err) {
      console.warn('Failed to load user role', err);
    }
    // Default to user if role not found
    return 'user';
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



