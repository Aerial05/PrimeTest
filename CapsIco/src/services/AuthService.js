import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';

export class AuthService {
  /**
   * Change the current user's password after re-authenticating with the current password.
   * Throws descriptive errors for common cases.
   */
  static async changePassword(auth, currentPassword, newPassword) {
    const user = auth.currentUser;
    if (!user) throw new Error('Not authenticated');

    const hasPasswordProvider = (user.providerData || []).some(p => p.providerId === 'password');
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
      // Normalize common reauth errors
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
}

export default AuthService;

