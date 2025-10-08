import React, { useEffect, useState, useMemo, useRef } from 'react';
// Reuse the exact user profile styles for visual parity
import styles from '@/pages/user/settings/Profile/SettingsContentUser.module.css';
import { auth, usersDB } from '@/config/firebase-config';
import { onAuthStateChanged, updateProfile, reload, sendEmailVerification, signOut } from 'firebase/auth';
import authService from '@/services/AuthService';
import { ref, get, update as dbUpdate } from 'firebase/database';
import { useToast } from '@/components/shared/toast/ToastProvider.jsx';
import { formatPHDisplay, toE164PH as toE164, isValidE164PH as isValidE164 } from '@/utils/phone';

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
  // Phone and verification (mirror user profile UX)
  const [phone, setPhone] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState(['','','','','','']);
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneBusy, setPhoneBusy] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showVisibleCaptcha, setShowVisibleCaptcha] = useState(false);
  const otpRefs = useRef(Array.from({ length: 6 }, () => React.createRef()));
  const [email, setEmail] = useState('');
  const [createdAt, setCreatedAt] = useState('');
  const [lastLoginAt, setLastLoginAt] = useState('');

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
    const rawPhone = dbv.phone ?? (u.phoneNumber || '');
    setPhone(formatPHDisplay(rawPhone));
    setPhoneVerified(!!dbv.phoneVerified);

        // createdAt from auth metadata (fallback) and DB; prefer DB if present
        const metaCreated = u.metadata?.creationTime ? new Date(u.metadata.creationTime).toISOString() : '';
        const dbCreated = dbv.createdAt ? new Date(dbv.createdAt).toISOString() : '';
        setCreatedAt(dbCreated || metaCreated);
        setLastLoginAt(dbv.lastLoginAt ? new Date(dbv.lastLoginAt).toISOString() : '');
      } catch (e) {
        setError('Failed to load admin profile');
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // cooldown timer for resend code
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

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
      // Email editing is disabled here to mirror user profile view

      // Update DB profile
      const updates = {
        firstName,
        middleName,
        lastName,
        username,
        phone: toE164(phone),
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
      if (cur?.email) {
        setEmail(cur.email);
        try {
          await dbUpdate(ref(usersDB, `users/${cur.uid}`), { email: cur.email });
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

  // Helpers mirroring user profile
  const maskEmail = (val) => {
    const e = String(val || '').trim();
    const at = e.indexOf('@');
    if (at <= 0) return e ? e.replace(/.(?=.{2})/g, '*') : '';
    const local = e.slice(0, at);
    const domain = e.slice(at + 1);
    const start = local.slice(0, 2);
    const end = local.slice(-1);
    const maskedLocal = local.length <= 3 ? `${local[0] || ''}***` : `${start}***${end}`;
    return `${maskedLocal}@${domain}`;
  };

  const maskPhoneDisplay = (val) => {
    const e164 = toE164(val);
    const m = /^\+63(\d{10})$/.exec(e164 || '');
    if (!m) return formatPHDisplay(val);
    const digits = m[1];
    const first = digits.slice(0, 1);
    const last4 = digits.slice(-4);
    return `+63 ${first}*** *** ${last4}`;
  };

  const handleSendPhoneOtp = async () => {
    setError('');
    const e164 = toE164(phone);
    if (!/^\+63\d{10}$/.test(e164)) { setError('Enter a valid PH number (+63)'); return; }
    setPhoneBusy(true);
    try {
      const containerId = showVisibleCaptcha ? 'admin-profile-phone-recaptcha-visible' : 'admin-profile-phone-recaptcha';
      await authService.startLinkPhone(e164, containerId, showVisibleCaptcha ? { size: 'normal' } : { size: 'invisible' });
      setPhoneOtpSent(true);
      setResendCooldown(60);
    } catch (e) {
      setError(e?.message || 'Failed to send verification code');
      if (String(e?.code || e?.message || '').toLowerCase().includes('captcha') || String(e?.code || e?.message || '').toLowerCase().includes('invalid-app-credential')) {
        setShowVisibleCaptcha(true);
      }
    } finally { setPhoneBusy(false); }
  };

  const handleConfirmPhoneOtp = async (e) => {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    setError('');
    const code = phoneOtp.join('');
    if (code.length !== 6) { setError('Enter the 6-digit code'); return; }
    setPhoneBusy(true);
    try {
      await authService.confirmLinkPhone(code);
      const uid = authService.currentUser?.uid || user?.uid;
      const e164 = toE164(phone);
      if (uid && e164) {
        await dbUpdate(ref(usersDB, `users/${uid}`), { phone: e164, phoneVerified: true });
      }
      setPhoneVerified(true);
      setPhoneOtp(['','','','','','']);
      setPhoneOtpSent(false);
      setSuccess('Phone verified');
    } catch (err) {
      setError(err?.message || 'Invalid code. Try again.');
    } finally { setPhoneBusy(false); }
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
  <h2>Profile Settings</h2>
  <p>Manage your account information and preferences.</p>

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
              <label htmlFor="username">Username</label>
              <input type="text" id="username" value={username} onChange={(e)=>setUsername(e.target.value)} disabled={loading || saving} />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="email">Email Address</label>
              <input type="email" id="email" value={maskEmail(email)} disabled />
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
              <input
                type="tel"
                id="phone"
                inputMode="numeric"
                maxLength={16}
                value={phoneVerified ? maskPhoneDisplay(phone) : phone}
                onChange={(e)=> setPhone(formatPHDisplay(e.target.value))}
                placeholder="+63 912 345 6789"
                disabled={loading || phoneVerified}
              />
              {showVisibleCaptcha && (
                <div style={{ marginTop: 8 }}>
                  <div id="admin-profile-phone-recaptcha-visible"></div>
                  <div className={styles.muted} style={{ marginTop: 4 }}>Please solve the reCAPTCHA and try sending the code again.</div>
                </div>
              )}
              <div className={styles.statusRow}>
                <span className={`${styles.statusBadge} ${phoneVerified ? styles.verified : styles.unverified}`}>
                  <span className={styles.dot}></span>
                  {phoneVerified ? 'PH Phone Verified' : 'PH Phone Not Verified'}
                </span>
                {!phoneVerified && (
                  !phoneOtpSent ? (
                    <button type="button" className={styles.linkBtn} onClick={handleSendPhoneOtp} disabled={phoneBusy || loading || !isValidE164(toE164(phone))}>
                      {phoneBusy ? 'Sending…' : 'Verify phone via SMS'}
                    </button>
                  ) : (
                    <>
                      <div className={styles.inlineActions}>
                        <div className={styles.verificationInputs}>
                          {phoneOtp.map((d, i) => (
                            <input
                              key={i}
                              ref={otpRefs.current[i]}
                              className={styles.codeInput}
                              value={d}
                              onChange={(e)=>{
                                const v = (e.target.value || '').replace(/\D/g,'').slice(-1);
                                const next = [...phoneOtp]; next[i] = v; setPhoneOtp(next);
                                if (v && i < otpRefs.current.length - 1) otpRefs.current[i+1]?.current?.focus();
                              }}
                              maxLength={1}
                              inputMode="numeric"
                              pattern="\d*"
                              aria-label={`Digit ${i+1}`}
                            />
                          ))}
                        </div>
                        <button type="button" onClick={handleConfirmPhoneOtp} className={styles.btnPrimary} disabled={phoneBusy}>
                          {phoneBusy ? 'Verifying…' : 'Confirm'}
                        </button>
                        <button type="button" className={styles.linkBtn} onClick={handleSendPhoneOtp} disabled={phoneBusy || resendCooldown > 0}>
                          {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                        </button>
                      </div>
                    </>
                  )
                )}
                {phoneVerified && (
                  <button type="button" className={styles.linkBtn} onClick={()=>{/* Future: implement change-phone flow modal like user */}}>
                    Change phone number
                  </button>
                )}
              </div>
              {/* Invisible reCAPTCHA container */}
              <div id="admin-profile-phone-recaptcha" style={{ position:'absolute', left:-9999, bottom:0 }} />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="createdAt">Created</label>
              <input type="text" id="createdAt" value={createdAt ? new Date(createdAt).toLocaleString() : ''} disabled />
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
                  {showCur ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5 0-9.27-3.11-11-8 1-2.73 2.76-4.99 5-6.42"/>
                      <path d="M1 1l22 22"/>
                      <path d="M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-.58"/>
                      <path d="M9.88 5.09A10.94 10.94 0 0 1 12 4c5 0 9.27 3.11 11 8a11.66 11.66 0 0 1-2.17 3.19"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
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
                  {showNew ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5 0-9.27-3.11-11-8 1-2.73 2.76-4.99 5-6.42"/>
                      <path d="M1 1l22 22"/>
                      <path d="M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-.58"/>
                      <path d="M9.88 5.09A10.94 10.94 0 0 1 12 4c5 0 9.27 3.11 11 8a11.66 11.66 0 0 1-2.17 3.19"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
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
                  {showConf ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5 0-9.27-3.11-11-8 1-2.73 2.76-4.99 5-6.42"/>
                      <path d="M1 1l22 22"/>
                      <path d="M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-.58"/>
                      <path d="M9.88 5.09A10.94 10.94 0 0 1 12 4c5 0 9.27 3.11 11 8a11.66 11.66 0 0 1-2.17 3.19"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  )}
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
