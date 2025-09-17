import React, { useEffect, useState, useMemo } from 'react';
import styles from './SettingsContent.module.css';
import { auth, usersDB } from '@/config/firebase-config';
import { onAuthStateChanged, updateProfile, updateEmail, reload, sendEmailVerification, signOut } from 'firebase/auth';
import authService from '@/services/AuthService';
import { ref, get, update as dbUpdate } from 'firebase/database';
import { useToast } from '@/components/shared/toast/ToastProvider.jsx';

export function SettingsContent() {
  const { show } = useToast();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [verifSending, setVerifSending] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState('');
  const [reauthNeeded, setReauthNeeded] = useState(false);

  // Password change state
  const [curPass, setCurPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confPass, setConfPass] = useState('');
  const [passSaving, setPassSaving] = useState(false);
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [showCur, setShowCur] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConf, setShowConf] = useState(false);

  // Fields
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  // Store only the local part for PH numbers (e.g., 9XXXXXXXXX)
  const [phoneLocal, setPhoneLocal] = useState('');
  const [email, setEmail] = useState('');

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setError('');
      setSuccess('');
      if (!u) {
        setLoading(false);
        return;
      }

      try {
        setEmail(u.email || '');
        setEmailVerified(!!u.emailVerified);
        const display = u.displayName || '';
        const parts = display.split(' ');
        setFirstName(parts[0] || '');
        setMiddleName(parts.length > 2 ? parts.slice(1, -1).join(' ') : '');
        setLastName(parts.length > 1 ? parts[parts.length - 1] : '');

        // load DB profile if exists
        const snap = await get(ref(usersDB, `users/${u.uid}`));
        const dbv = snap.exists() ? snap.val() : {};
        setFirstName(dbv.firstName ?? (parts[0] || ''));
        setMiddleName(dbv.middleName ?? (parts.length > 2 ? parts.slice(1, -1).join(' ') : ''));
        setLastName(dbv.lastName ?? (parts.length > 1 ? parts[parts.length - 1] : ''));
  setUsername(dbv.username ?? '');
  // Parse and normalize to local part (strip +63/63/leading 0, keep digits only)
  const rawPhone = dbv.phone ?? (u.phoneNumber || '');
  const onlyDigits = String(rawPhone || '').replace(/\D/g, '');
  let local = onlyDigits;
  if (local.startsWith('63')) local = local.slice(2);
  if (local.startsWith('0')) local = local.slice(1);
  setPhoneLocal(local.slice(0, 10)); // cap to 10 digits typical PH mobile local part
      } catch (e) {
        setError('Failed to load admin profile');
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const fullName = useMemo(() => [firstName, middleName, lastName].filter(Boolean).join(' '), [firstName, middleName, lastName]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      // Update auth profile displayName
      const displayName = fullName.trim();
      if (displayName && displayName !== user.displayName) {
        await updateProfile(user, { displayName });
      }
      // Email updates are sensitive; only update if changed and allowed
      if (email && email !== user.email) {
        await updateEmail(user, email);
      }

      // Update DB profile
      const fullPhone = phoneLocal
        ? `+63${phoneLocal.startsWith('0') ? phoneLocal.slice(1) : phoneLocal}`
        : '';

      const updates = {
        firstName,
        middleName,
        lastName,
        username,
        phone: fullPhone,
        updatedAt: new Date().toISOString(),
      };
      await dbUpdate(ref(usersDB, `users/${user.uid}`), updates);

      // reload to get latest emailVerified etc.
  await reload(user);
  setEmailVerified(!!auth.currentUser?.emailVerified);
      setSuccess('Profile saved');
      show({ type: 'success', title: 'Saved', message: 'Your profile changes were saved successfully.' });
    } catch (err) {
      setError(err?.message || 'Failed to save profile');
      show({ type: 'error', title: 'Save failed', message: err?.message || 'Failed to save profile.' });
    } finally {
      setSaving(false);
    }
  };

  const isPasswordProvider = useMemo(() => {
    return !!(user?.providerData || []).some(p => p.providerId === 'password');
  }, [user]);

  const sendVerification = async () => {
    if (!user || emailVerified) return;
    setVerifSending(true);
    setVerifyMsg('');
    try {
      await sendEmailVerification(user);
      setVerifyMsg('Verification email sent. Please check your inbox.');
    } catch (e) {
      if (e?.code === 'auth/requires-recent-login') {
        setReauthNeeded(true);
        setVerifyMsg('Session expired. Please re-authenticate to send verification.');
      } else {
        setVerifyMsg('Failed to send verification email');
      }
    } finally {
      setVerifSending(false);
    }
  };

  const recheckVerification = async () => {
    if (!user) return;
    try {
      await reload(user);
      setEmailVerified(!!auth.currentUser?.emailVerified);
      const cur = auth.currentUser;
      if (cur?.email && cur.email !== email) {
        setEmail(cur.email);
        try {
          await dbUpdate(ref(usersDB, `users/${cur.uid}`), { email: cur.email, updatedAt: new Date().toISOString() });
        } catch (_) {
          // ignore DB sync failure
        }
      }
    } catch (_e) {
      if (_e?.code === 'auth/requires-recent-login') {
        setReauthNeeded(true);
        setVerifyMsg('Session expired. Please re-authenticate to refresh status.');
      }
    }
  };

  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');
    if (!user) return;
    if (!isPasswordProvider) {
      setPassError('This account was created with a provider (e.g., Google) and does not have a password.');
      return;
    }
    if (!newPass || newPass.length < 6) {
      setPassError('New password must be at least 6 characters.');
      return;
    }
    if (newPass !== confPass) {
      setPassError('New passwords do not match.');
      return;
    }
    if (curPass === newPass) {
      setPassError('New password must be different from current.');
      return;
    }
    setPassSaving(true);
    try {
      await authService.changePassword(curPass, newPass);
      setPassSuccess('Password updated successfully.');
      show({ type: 'success', title: 'Password updated', message: 'Your password was changed successfully.' });
      setCurPass('');
      setNewPass('');
      setConfPass('');
    } catch (e) {
      setPassError(e?.message || 'Failed to update password.');
      show({ type: 'error', title: 'Password update failed', message: e?.message || 'Failed to update password.' });
      if (e?.message && e.message.includes('re-login')) {
        setReauthNeeded(true);
      }
    } finally {
      setPassSaving(false);
    }
  };

  return (
    <div className={styles.content}>
      <h2>Admin Settings</h2>
      <p>Manage the administrator account information and preferences.</p>

      {/* Personal Information */}
      <section className={styles.section}>
        <h3>Personal Information</h3>
        <form onSubmit={handleSave}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="firstName">First Name</label>
              <input type="text" id="firstName" value={firstName} onChange={(e)=>setFirstName(e.target.value)} disabled={loading || saving} required />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="lastName">Last Name</label>
              <input type="text" id="lastName" value={lastName} onChange={(e)=>setLastName(e.target.value)} disabled={loading || saving} required />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="middleName">Middle Name</label>
              <input type="text" id="middleName" value={middleName} onChange={(e)=>setMiddleName(e.target.value)} disabled={loading || saving} />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="username">Username</label>
              <input type="text" id="username" value={username} onChange={(e)=>setUsername(e.target.value)} disabled={loading || saving} />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="email">Email Address</label>
              <input type="email" id="email" value={email} onChange={(e)=>setEmail(e.target.value)} disabled={loading || saving} />
              <div className={styles.statusRow}>
                <span className={`${styles.statusBadge} ${emailVerified ? styles.verified : styles.unverified}`}>
                  <span className={styles.dot}></span>
                  {emailVerified ? 'Verified' : 'Not verified'}
                </span>
                {!emailVerified && (
                  <button type="button" onClick={sendVerification} disabled={verifSending} className={styles.linkBtn}>
                    {verifSending ? 'Sending…' : 'Send verification email'}
                  </button>
                )}
                <button type="button" onClick={recheckVerification} className={styles.linkBtn}>
                  Recheck status
                </button>
                {verifyMsg && <span className={styles.muted}>{verifyMsg}</span>}
                {reauthNeeded && (
                  <>
                    <span className={styles.muted}> — Re-auth required.</span>
                    <button
                      type="button"
                      className={styles.linkBtn}
                      onClick={async ()=>{ try { await signOut(auth); } finally { window.location.href = '/login'; } }}
                    >Re-authenticate</button>
                  </>
                )}
              </div>
              <div className={styles.muted}>
                {emailVerified
                  ? 'Your email is verified.'
                  : 'Verify your current email to enable more account actions.'}
              </div>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="phone">Phone Number</label>
              <div className={styles.phoneField}>
                <span className={styles.phonePrefix}>+63</span>
                <input
                  type="tel"
                  id="phone"
                  className={styles.phoneInput}
                  value={phoneLocal}
                  onChange={(e)=>{
                    const digits = e.target.value.replace(/\D/g, '');
                    setPhoneLocal(digits.slice(0, 10));
                  }}
                  placeholder="9XXXXXXXXX"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  disabled={loading || saving}
                />
              </div>
              <div className={styles.muted}>Philippine numbers. Enter the 10-digit mobile number after +63.</div>
            </div>
          </div>

          {(error || success) && (
            <div className={styles.formRow}>
              {error && <p style={{color:'#ef4444', margin:0}}>{error}</p>}
              {success && <p style={{color:'#10b981', margin:0}}>{success}</p>}
            </div>
          )}

          <div className={styles.formActions}>
            <button 
              type="button" 
              className={styles.btnSecondary} 
              disabled={saving || loading}
              onClick={() => {
                // Reset form to original values
                setFirstName(user?.displayName?.split(' ')[0] || '');
                setMiddleName(user?.displayName?.split(' ').length > 2 ? user.displayName.split(' ').slice(1, -1).join(' ') : '');
                setLastName(user?.displayName?.split(' ').length > 1 ? user.displayName.split(' ')[user.displayName.split(' ').length - 1] : '');
                setEmail(user?.email || '');
                setError('');
                setSuccess('');
              }}
            >
              Cancel
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={saving || loading}>
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </form>
      </section>

      {/* Password */}
      <section className={styles.section}>
        <h3>Password</h3>
        <form onSubmit={handlePasswordSubmit}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="currentPassword">Current Password</label>
              <div className={styles.inputWrap}>
                <input
                  type={showCur ? 'text' : 'password'}
                  id="currentPassword"
                  value={curPass}
                  onChange={(e)=>setCurPass(e.target.value)}
                  disabled={loading || passSaving || !isPasswordProvider}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  aria-label={showCur ? 'Hide password' : 'Show password'}
                  onClick={()=>setShowCur(v=>!v)}
                  disabled={loading || passSaving || !isPasswordProvider}
                >
                  {showCur ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          </div>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="newPassword">New Password</label>
              <div className={styles.inputWrap}>
                <input
                  type={showNew ? 'text' : 'password'}
                  id="newPassword"
                  value={newPass}
                  onChange={(e)=>setNewPass(e.target.value)}
                  disabled={loading || passSaving || !isPasswordProvider}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  aria-label={showNew ? 'Hide password' : 'Show password'}
                  onClick={()=>setShowNew(v=>!v)}
                  disabled={loading || passSaving || !isPasswordProvider}
                >
                  {showNew ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <div className={styles.inputWrap}>
                <input
                  type={showConf ? 'text' : 'password'}
                  id="confirmPassword"
                  value={confPass}
                  onChange={(e)=>setConfPass(e.target.value)}
                  disabled={loading || passSaving || !isPasswordProvider}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  className={styles.eyeBtn}
                  aria-label={showConf ? 'Hide password' : 'Show password'}
                  onClick={()=>setShowConf(v=>!v)}
                  disabled={loading || passSaving || !isPasswordProvider}
                >
                  {showConf ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
          </div>
          {(passError || passSuccess || (!isPasswordProvider && user)) && (
            <div className={styles.formRow}>
              {!isPasswordProvider && user && (
                <p className={styles.muted} style={{margin:0}}>
                  Your account uses a federated provider (e.g., Google, Facebook). Password changes are not available.
                </p>
              )}
              {passError && <p style={{color:'#ef4444', margin:0}}>{passError}</p>}
              {passSuccess && <p style={{color:'#10b981', margin:0}}>{passSuccess}</p>}
            </div>
          )}
          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.btnSecondary}
              disabled={passSaving || loading}
              onClick={()=>{ setCurPass(''); setNewPass(''); setConfPass(''); setPassError(''); setPassSuccess(''); }}
            >Cancel</button>
            <button
              type="submit"
              className={styles.btnPrimary}
              disabled={passSaving || loading || !isPasswordProvider}
            >{passSaving ? 'Updating…' : 'Update Password'}</button>
          </div>
        </form>
      </section>
    </div>
  );
}
