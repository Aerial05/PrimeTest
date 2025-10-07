import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './SettingsContentUser.module.css';
import { auth, usersDB } from '/src/config/firebase-config';
import { onAuthStateChanged, updateProfile, sendEmailVerification, reload, signOut, fetchSignInMethodsForEmail, updateEmail } from 'firebase/auth';
import authService from '/src/services/AuthService';
import { get, ref, set, update } from 'firebase/database';
import { useNavigate } from 'react-router-dom';
import { formatPHDisplay, toE164PH, isValidE164PH } from '/src/utils/phone';

export function SettingsContent() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [verifSending, setVerifSending] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState('');
  const [emailError, setEmailError] = useState('');
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

  // Modal state for change-email flow
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailModalStep, setEmailModalStep] = useState('verify'); // 'verify' | 'enterNew'
  const [modalCode, setModalCode] = useState(''); // UI only (Firebase uses link)
  const [modalNewEmail, setModalNewEmail] = useState('');
  const [modalBusy, setModalBusy] = useState(false);
  const [modalMsg, setModalMsg] = useState('');

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [username, setUsername] = useState('');
  const [prevUsername, setPrevUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [initialEmail, setInitialEmail] = useState('');
  const [createdAt, setCreatedAt] = useState('');
  const [lastLoginAt, setLastLoginAt] = useState('');
  const [phoneVerified, setPhoneVerified] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState(['','','','','','']);
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneBusy, setPhoneBusy] = useState(false);
  const recaptchaPhoneRef = useState(null)[0];
  const [showVisibleCaptcha, setShowVisibleCaptcha] = useState(false);
  const otpRefs = useRef(Array.from({ length: 6 }, () => React.createRef()));
  const [resendCooldown, setResendCooldown] = useState(0);

  // Change phone modal
  const [changePhoneOpen, setChangePhoneOpen] = useState(false);
  const [changeStep, setChangeStep] = useState('choose'); // choose | emailVerify | smsVerify | newPhone | confirmNew
  const [changeBusy, setChangeBusy] = useState(false);
  const [changeMsg, setChangeMsg] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [reauthOtp, setReauthOtp] = useState(['','','','','','']);
  const reauthRefs = useRef(Array.from({ length: 6 }, () => React.createRef()));
  const [newOtp, setNewOtp] = useState(['','','','','','']);
  const newOtpRefs = useRef(Array.from({ length: 6 }, () => React.createRef()));
  const [smsCooldown, setSmsCooldown] = useState(0);
  const [newCooldown, setNewCooldown] = useState(0);
  const [showReauthCaptcha, setShowReauthCaptcha] = useState(false);
  const [showNewCaptcha, setShowNewCaptcha] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  useEffect(() => {
    if (smsCooldown <= 0) return;
    const t = setInterval(() => setSmsCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [smsCooldown]);

  useEffect(() => {
    if (newCooldown <= 0) return;
    const t = setInterval(() => setNewCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [newCooldown]);

  useEffect(() => {
    if (phoneOtpSent) {
      // Focus the first OTP input when we start the verification step
      setTimeout(() => otpRefs.current?.[0]?.current?.focus(), 50);
    }
  }, [phoneOtpSent]);

  // Load current auth user and profile data from DB
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
        const uid = u.uid;
        setEmail(u.email || '');
        setInitialEmail(u.email || '');
        setEmailVerified(!!u.emailVerified);
        // derive names from displayName if present
        const display = u.displayName || '';
        const [first = '', ...rest] = display.split(' ');
        const last = rest.join(' ');

        // Joined from metadata
        const created = u.metadata?.creationTime ? new Date(u.metadata.creationTime) : null;
        if (created) setCreatedAt(created.toISOString());

        // Load DB profile
        const snap = await get(ref(usersDB, `users/${uid}`));
  const dbv = snap.exists() ? snap.val() : {};

  setFirstName(dbv.firstName ?? first);
        setLastName(dbv.lastName ?? last);
        const uname = dbv.username ?? '';
        setUsername(uname);
        setPrevUsername(uname);
  const rawPhone = dbv.phone ?? (u.phoneNumber || '');
  setPhone(formatPHDisplay(rawPhone));
  setPhoneVerified(!!dbv.phoneVerified);
  if (dbv?.createdAt) try { setCreatedAt(new Date(dbv.createdAt).toISOString()); } catch {}
  if (dbv?.lastLoginAt) try { setLastLoginAt(new Date(dbv.lastLoginAt).toISOString()); } catch {}
      } catch (e) {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  // Admin detection removed (no test-only Unverify in production UI)

  const fullName = useMemo(() => `${firstName} ${lastName}`.trim(), [firstName, lastName]);
  const isPasswordProvider = useMemo(() => {
    return !!(user?.providerData || []).some(p => p.providerId === 'password');
  }, [user]);

  // PH format: +63 9XX XXX XXXX for display, store E.164 +639XXXXXXXXX
  const formatPhone = (value) => formatPHDisplay(value);

  const toE164 = (value) => toE164PH(value);

  // Masking helpers
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
    const first = digits.slice(0, 1); // first after +63
    const last4 = digits.slice(-4);
    return `+63 ${first}*** *** ${last4}`;
  };

  const handleSendPhoneOtp = async () => {
    setError('');
    const e164 = toE164(phone);
    if (!/^\+63\d{10}$/.test(e164)) { setError('Enter a valid PH number (+63)'); return; }
    setPhoneBusy(true);
    try {
  const containerId = showVisibleCaptcha ? 'profile-phone-recaptcha-visible' : 'profile-phone-recaptcha';
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
  // Confirm linking (keeps current session intact)
  await authService.confirmLinkPhone(code);
      // Persist phone and mark verified in DB
      const uid = authService.currentUser?.uid || user?.uid;
      const e164 = toE164(phone);
      if (uid && e164) {
        await update(ref(usersDB, `users/${uid}`), { phone: e164, phoneVerified: true });
      }
      setPhoneVerified(true);
      setPhoneOtp(['','','','','','']);
      setPhoneOtpSent(false);
      setSuccess('Phone verified');
    } catch (err) {
      setError(err?.message || 'Invalid code. Try again.');
    } finally { setPhoneBusy(false); }
  };

  // Unverify/test-only action removed from production UI

  const handleOtpInputChange = (idx, value) => {
    const v = (value || '').replace(/\D/g, '').slice(-1);
    const next = [...phoneOtp];
    next[idx] = v;
    setPhoneOtp(next);
    if (v && idx < otpRefs.current.length - 1) {
      otpRefs.current[idx + 1]?.current?.focus();
    }
  };

  const handleCodeInputChange = (arrSetter, idx, value, refs, onComplete) => {
    const v = (value || '').replace(/\D/g, '').slice(-1);
    arrSetter((prev) => {
      const next = [...prev];
      next[idx] = v;
      // auto-advance focus when a digit is entered
      if (v && refs && refs.current && refs.current[idx + 1] && refs.current[idx + 1].current) {
        setTimeout(() => refs.current[idx + 1].current.focus(), 0);
      }
      // auto-complete when all 6 digits are filled
      if (typeof onComplete === 'function') {
        const code = next.join('');
        if (code.length === 6) {
          setTimeout(() => onComplete(code), 0);
        }
      }
      return next;
    });
  };

  const focusNext = (refs, idx, dir) => {
    const nextIdx = idx + (dir || 1);
    if (nextIdx >= 0 && nextIdx < refs.current.length) refs.current[nextIdx]?.current?.focus();
  };

  const handleCodeKeyDown = (refs, values, idx, e, onEnter) => {
    if (e.key === 'Backspace') { if (!values[idx] && idx > 0) focusNext(refs, idx, -1); }
    if (e.key === 'ArrowLeft' && idx > 0) { e.preventDefault(); focusNext(refs, idx, -1); }
    if (e.key === 'ArrowRight' && idx < refs.current.length - 1) { e.preventDefault(); focusNext(refs, idx, +1); }
    if (e.key === 'Enter' && typeof onEnter === 'function') onEnter();
  };

  const handleCodePaste = (arrSetter, refs, e, onComplete) => {
    const text = (e.clipboardData || window.clipboardData).getData('text');
    const digits = (text || '').replace(/\D/g, '').slice(0, 6).split('');
    if (!digits.length) return;
    e.preventDefault();
    arrSetter(() => {
      const next = Array.from({ length: 6 }, (_, i) => digits[i] || '');
      return next;
    });
    const lastIdx = Math.min(digits.length - 1, 5);
    if (lastIdx >= 0) refs.current[lastIdx]?.current?.focus();
    if (typeof onComplete === 'function' && digits.length === 6) {
      setTimeout(() => onComplete(digits.join('')), 0);
    }
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace') {
      if (!phoneOtp[idx] && idx > 0) {
        otpRefs.current[idx - 1]?.current?.focus();
      }
    }
    if (e.key === 'ArrowLeft' && idx > 0) {
      e.preventDefault();
      otpRefs.current[idx - 1]?.current?.focus();
    }
    if (e.key === 'ArrowRight' && idx < otpRefs.current.length - 1) {
      e.preventDefault();
      otpRefs.current[idx + 1]?.current?.focus();
    }
    if (e.key === 'Enter') {
      const code = phoneOtp.join('');
      if (code.length === 6) {
        handleConfirmPhoneOtp(e);
      }
    }
  };

  const handleOtpPaste = (e) => {
    const text = (e.clipboardData || window.clipboardData).getData('text');
    const digits = (text || '').replace(/\D/g, '').slice(0, 6).split('');
    if (!digits.length) return;
    e.preventDefault();
    const next = [...phoneOtp];
    for (let i = 0; i < 6; i += 1) {
      next[i] = digits[i] || '';
    }
    setPhoneOtp(next);
    const lastIdx = Math.min(digits.length - 1, 5);
    if (lastIdx >= 0) {
      otpRefs.current[lastIdx]?.current?.focus();
    }
  };

  // Finalize new phone number update
  const confirmNewPhone = async (codeArg) => {
    const code = (codeArg && String(codeArg)) || newOtp.join('');
    if (code.length !== 6) { setChangeMsg('Enter the 6-digit code'); return; }
    setChangeBusy(true);
    setChangeMsg('');
    try {
      await authService.confirmUpdatePhone(code);
      const uid = authService.currentUser?.uid || user?.uid;
      const e164 = toE164(newPhone);
      if (uid && e164) {
        await update(ref(usersDB, `users/${uid}`), { phone: e164, phoneVerified: true });
      }
      // Reflect in local UI
      setPhone(formatPhone(newPhone));
      setPhoneVerified(true);
      setChangePhoneOpen(false);
      setSuccess('Phone number updated and verified.');
      setError('');
    } catch (err) {
      if (err?.code === 'auth/requires-recent-login') {
        setChangeMsg('Your session is too old. Please verify via SMS to your current phone to continue.');
        setChangeStep('smsVerify');
      } else {
        setChangeMsg(err?.message || 'Failed to update phone.');
      }
    } finally {
      setChangeBusy(false);
    }
  };

  const handleCancel = () => {
    // Re-trigger auth listener derived values without reloading
    if (!user) return;
    setFirstName('');
    setLastName('');
    setUsername('');
    setPhone('');
    setLoading(true);
    // Re-run effect quickly by manual load
    (async () => {
      try {
        const uid = user.uid;
        const snap = await get(ref(usersDB, `users/${uid}`));
        const v = snap.exists() ? snap.val() : {};
        const display = user.displayName || '';
        const [first = '', ...rest] = display.split(' ');
        const last = rest.join(' ');
        setFirstName(v.firstName ?? first);
        setLastName(v.lastName ?? last);
        setUsername(v.username ?? '');
        setPhone(formatPhone(v.phone ?? (user.phoneNumber || '')));
        setSuccess('Changes discarded');
        setError('');
      } finally {
        setLoading(false);
      }
    })();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setError('');
    setSuccess('');
    setEmailError('');
    try {
      // Update auth display name
      const displayName = (username || fullName || user.displayName || '').trim();
      if (displayName && displayName !== user.displayName) {
        await updateProfile(user, { displayName });
      }

      // Email changing is disabled for now; skipping auth email updates.
      // Upsert DB profile
      const uid = user.uid;
      const profileRef = ref(usersDB, `users/${uid}`);
      await update(profileRef, {
        firstName,
        lastName,
        username,
        phone: toE164(phone),
        email: user.email || email,
      });
      // Handle username mapping updates used across the app
      const trimmedNew = (username || '').trim();
      const trimmedOld = (prevUsername || '').trim();
      if (trimmedNew !== trimmedOld) {
        if (trimmedNew) {
          const existing = await get(ref(usersDB, `usernames/${trimmedNew}`));
          const existingVal = existing.exists() ? existing.val() : null;
          if (existingVal && existingVal !== (user.email || email)) {
            throw new Error('Username already taken');
          }
          await set(ref(usersDB, `usernames/${trimmedNew}`), user.email || email);
          await update(ref(usersDB, `usersByUsername/${trimmedNew}`), { email: user.email || email, uid });
        }
        if (trimmedOld) {
          await set(ref(usersDB, `usernames/${trimmedOld}`), null);
          await set(ref(usersDB, `usersByUsername/${trimmedOld}`), null);
        }
        setPrevUsername(trimmedNew);
      }
      setSuccess('Profile saved');
    } catch (err) {
      setError(err?.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

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
      setCurPass('');
      setNewPass('');
      setConfPass('');
    } catch (e) {
      setPassError(e?.message || 'Failed to update password.');
      if (e?.message && e.message.includes('re-login')) {
        setReauthNeeded(true);
      }
    } finally {
      setPassSaving(false);
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
          await update(ref(usersDB, `users/${cur.uid}`), { email: cur.email });
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

  return (
    <div className={styles.content}>
      <h2>Profile Settings</h2>
      <p>Manage your account information and preferences.</p>

      {/* Personal Information */}
      <section className={styles.section}>
        <h3>Personal Information</h3>
        <form onSubmit={handleSubmit}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="firstName">First Name</label>
              <input type="text" id="firstName" value={firstName} onChange={(e)=>setFirstName(e.target.value)} disabled={loading} required />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="lastName">Last Name</label>
              <input type="text" id="lastName" value={lastName} onChange={(e)=>setLastName(e.target.value)} disabled={loading} required />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="username">Username</label>
              <input type="text" id="username" value={username} onChange={(e)=>setUsername(e.target.value)} disabled={loading} />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="email">Email Address</label>
              <input type="email" id="email" value={maskEmail(email)} disabled />
              {emailError && <div className={styles.muted} style={{color:'#b91c1c'}}>{emailError}</div>}
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
                      onClick={async ()=>{ try { await signOut(auth); } finally { navigate('/login'); } }}
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
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="phone">Phone Number</label>
              <input
                type="tel"
                id="phone"
                inputMode="numeric"
                maxLength={16}
                value={phoneVerified ? maskPhoneDisplay(phone) : phone}
                onChange={(e)=> setPhone(formatPhone(e.target.value))}
                placeholder="+63 912 345 6789"
                disabled={loading || phoneVerified}
              />
              {showVisibleCaptcha && (
                <div style={{ marginTop: 8 }}>
                  <div id="profile-phone-recaptcha-visible"></div>
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
                    <button type="button" className={styles.linkBtn} onClick={handleSendPhoneOtp} disabled={phoneBusy || loading || !isValidE164PH(toE164(phone))}>
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
                              onChange={(e)=> handleOtpInputChange(i, e.target.value)}
                              onKeyDown={(e)=> handleOtpKeyDown(i, e)}
                              onPaste={handleOtpPaste}
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
                      {/* Test-only hint removed */}
                    </>
                  )
                )}
                {phoneVerified && (
                  <button type="button" className={styles.linkBtn} onClick={()=>{ setChangePhoneOpen(true); setChangeStep('choose'); setChangeMsg(''); setNewPhone(''); setReauthOtp(['','','','','','']); setNewOtp(['','','','','','']); }}>
                    Change phone number
                  </button>
                )}
              </div>
            </div>
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
            <button type="button" onClick={handleCancel} className={styles.btnSecondary} disabled={saving || loading}>Cancel</button>
            <button type="submit" className={styles.btnPrimary} disabled={saving || loading}>{saving ? 'Saving…' : 'Save Changes'}</button>
          </div>
        </form>
      </section>

      {/* Preferences (non-functional placeholders) */}
      <section className={styles.section}>
        <h3>Preferences</h3>
        {[
          { label: 'Email Notifications', desc: 'Receive email notifications for important updates', checked: true },
          { label: 'Two-Factor Authentication', desc: 'Add an extra layer of security to your account', checked: false },
        ].map((pref, i) => (
          <div key={i} className={styles.switchContainer}>
            <div className={styles.switchLabel}>
              <h4>{pref.label}</h4>
              <p>{pref.desc}</p>
            </div>
            <label className={styles.switch}>
              <input type="checkbox" defaultChecked={pref.checked} disabled />
              <span className={styles.slider}></span>
            </label>
          </div>
        ))}
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
                    // eye-off
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                      <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-5 0-9.27-3.11-11-8 1-2.73 2.76-4.99 5-6.42"/>
                      <path d="M1 1l22 22"/>
                      <path d="M10.58 10.58A2 2 0 0 0 12 14a2 2 0 0 0 1.42-.58"/>
                      <path d="M9.88 5.09A10.94 10.94 0 0 1 12 4c5 0 9.27 3.11 11 8a11.66 11.66 0 0 1-2.17 3.19"/>
                    </svg>
                  ) : (
                    // eye
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
      
      {/* Email change modal */}
      {emailModalOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h4 className={styles.modalTitle}>
                {emailModalStep === 'verify' ? 'Verify your current email' : 'Enter new email'}
              </h4>
              <button className={styles.closeBtn} onClick={() => setEmailModalOpen(false)}>×</button>
            </div>
            <div className={styles.modalBody}>
              {emailModalStep === 'verify' && (
                <>
                  <p className={styles.muted}>We will send a verification email to <strong>{email}</strong>. Open the link to confirm. You can also enter a code here if provided.</p>
                  <input
                    className={styles.input}
                    placeholder="Enter code (optional if you clicked the link)"
                    value={modalCode}
                    onChange={(e)=>setModalCode(e.target.value)}
                  />
                  {modalMsg && <p className={styles.muted} style={{marginTop:8}}>{modalMsg}</p>}
                  <div className={styles.modalActions}>
                    <button className={styles.btnSecondary} onClick={async ()=>{ setModalBusy(true); setModalMsg('Sending…'); try { await sendEmailVerification(user); setModalMsg('Verification email sent. Check your inbox.'); } finally { setModalBusy(false); }}}>Send code</button>
                    <button className={styles.btnPrimary} onClick={async ()=>{ setModalBusy(true); try { await reload(user); const verified = !!auth.currentUser?.emailVerified; setEmailVerified(verified); if (verified) { setModalMsg('Verified!'); setEmailModalStep('enterNew'); } else { setModalMsg('Still not verified. Please open the email link.'); } } finally { setModalBusy(false); }}}>I clicked the link</button>
                  </div>
                </>
              )}

              {emailModalStep === 'enterNew' && (
                <>
                  <p className={styles.muted}>Enter your new email address. We’ll send a verification to that email.</p>
                  <input
                    className={styles.input}
                    placeholder="newemail@example.com"
                    value={modalNewEmail}
                    onChange={(e)=>setModalNewEmail(e.target.value)}
                  />
                  {modalMsg && <p className={styles.muted} style={{marginTop:8}}>{modalMsg}</p>}
                  <div className={styles.modalActions}>
                    <button className={styles.btnSecondary} onClick={()=>setEmailModalOpen(false)}>Cancel</button>
                    <button className={styles.btnPrimary} onClick={async ()=>{
                      setModalBusy(true); setModalMsg(''); setEmailError('');
                      try {
                        const newEmail = (modalNewEmail||'').trim();
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
                        if (!emailRegex.test(newEmail)) throw new Error('Please enter a valid email address.');
                        await fetchSignInMethodsForEmail(auth, newEmail);
                        await updateEmail(user, newEmail);
                        await sendEmailVerification(user);
                        setEmail(newEmail);
                        setInitialEmail(newEmail);
                        setEmailVerified(false);
                        setModalMsg('New email saved. Please verify via the email we sent.');
                        // save to DB immediately
                        const uid = user.uid;
                        await update(ref(usersDB, `users/${uid}`), { email: newEmail });
                      } catch(e) {
                        if (e?.code === 'auth/email-already-in-use') setEmailError('That email is already in use.');
                        else if (e?.code === 'auth/requires-recent-login') setEmailError('Please re-login to change your email.');
                        else setEmailError(e?.message || 'Failed to update email');
                      } finally {
                        setModalBusy(false);
                      }
                    }}>Save new email</button>
                  </div>
                  <div className={styles.modalActions}>
                    <button className={styles.btnSecondary} onClick={async ()=>{ setModalBusy(true); try { await reload(user); const verified = !!auth.currentUser?.emailVerified; setEmailVerified(verified); setModalMsg(verified ? 'New email verified!' : 'New email still not verified.'); } finally { setModalBusy(false); }}}>Recheck verification</button>
                    <button className={styles.btnPrimary} onClick={async ()=>{
                      setModalBusy(true); setEmailError('');
                      try {
                        const target = (modalNewEmail || email || '').trim();
                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
                        if (!emailRegex.test(target)) throw new Error('Please enter a valid email address to resend.');
                        // If target differs from current auth email, update first so Firebase sends to that address
                        if (user.email !== target) {
                          await fetchSignInMethodsForEmail(auth, target);
                          await updateEmail(user, target);
                          setEmail(target);
                          setInitialEmail(target);
                          setEmailVerified(false);
                          // persist to DB as well
                          const uid = user.uid; await update(ref(usersDB, `users/${uid}`), { email: target });
                        }
                        await sendEmailVerification(user);
                        setModalMsg(`Verification email sent to ${target}.`);
                      } catch(e) {
                        if (e?.code === 'auth/email-already-in-use') setEmailError('That email is already in use.');
                        else if (e?.code === 'auth/requires-recent-login') setEmailError('Please re-login to resend to a different email.');
                        else setEmailError(e?.message || 'Failed to send verification');
                      } finally {
                        setModalBusy(false);
                      }
                    }}>Resend verification</button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Change phone number modal */}
      {changePhoneOpen && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h4 className={styles.modalTitle}>Change phone number</h4>
              <button className={styles.closeBtn} onClick={()=> setChangePhoneOpen(false)}>×</button>
            </div>
            <div className={styles.modalBody}>
              {changeStep === 'choose' && (
                <>
                  <p className={styles.muted}>To change your phone number, first verify your identity. Choose a verification method.</p>
                  <div className={styles.modalActions}>
                    <button className={styles.btnSecondary} onClick={()=> setChangeStep('emailVerify')}>Verify via Email</button>
                    <button className={styles.btnPrimary} onClick={()=> setChangeStep('smsVerify')}>Verify via SMS</button>
                  </div>
                </>
              )}

              {changeStep === 'emailVerify' && (
                <>
                  <p className={styles.muted}>We'll send a verification email to <strong>{email}</strong>. After clicking the link, continue to enter a new phone number.</p>
                  {changeMsg && <p className={styles.muted} style={{marginTop:8}}>{changeMsg}</p>}
                  <div className={styles.modalActions}>
                    <button className={styles.btnSecondary} onClick={async ()=>{ setChangeBusy(true); try { await sendEmailVerification(auth.currentUser); setChangeMsg('Verification email sent. Click the link, then click "I clicked the link".'); } finally { setChangeBusy(false); } }}>Send email</button>
                    <button className={styles.btnPrimary} onClick={async ()=>{ setChangeBusy(true); try { await reload(auth.currentUser); if (auth.currentUser?.emailVerified) { setChangeMsg('Email verified.'); setChangeStep('newPhone'); } else { setChangeMsg('Still not verified. Please open the link in your email.'); } } finally { setChangeBusy(false); } }}>I clicked the link</button>
                  </div>
                </>
              )}

              {changeStep === 'smsVerify' && (
                <>
                  <p className={styles.muted}>We'll text a code to your current phone: <strong>{maskPhoneDisplay(phone)}</strong>.</p>
                  {showReauthCaptcha && <div style={{ marginTop: 8 }}><div id="change-phone-reauth-recaptcha-visible"></div><div className={styles.muted} style={{ marginTop: 4 }}>Solve the reCAPTCHA then resend.</div></div>}
                  <div className={styles.inlineActions}>
                    <div className={styles.verificationInputs}>
                      {reauthOtp.map((d, i) => (
                        <input
                          key={i}
                          ref={reauthRefs.current[i]}
                          className={styles.codeInput}
                          value={d}
                          onChange={(e)=> handleCodeInputChange(
                            setReauthOtp,
                            i,
                            e.target.value,
                            reauthRefs,
                            async (code) => {
                              // auto-confirm when all digits are present
                              setChangeBusy(true);
                              setChangeMsg('');
                              try {
                                await authService.confirmReauthPhone(code);
                                setChangeStep('newPhone');
                                setChangeMsg('Verified. Enter a new PH number.');
                              } catch (err) {
                                setChangeMsg(err?.message || 'Invalid code.');
                              } finally {
                                setChangeBusy(false);
                              }
                            }
                          )}
                          onKeyDown={(e)=> handleCodeKeyDown(reauthRefs, reauthOtp, i, e, async ()=>{ const code = reauthOtp.join(''); if (code.length===6) { setChangeBusy(true); setChangeMsg(''); try { await authService.confirmReauthPhone(code); setChangeStep('newPhone'); setChangeMsg('Verified. Enter a new PH number.'); } catch(err) { setChangeMsg(err?.message || 'Invalid code.'); } finally { setChangeBusy(false); } } })}
                          onPaste={(e)=> handleCodePaste(setReauthOtp, reauthRefs, e, async (code) => {
                            setChangeBusy(true);
                            setChangeMsg('');
                            try {
                              await authService.confirmReauthPhone(code);
                              setChangeStep('newPhone');
                              setChangeMsg('Verified. Enter a new PH number.');
                            } catch (err) {
                              setChangeMsg(err?.message || 'Invalid code.');
                            } finally {
                              setChangeBusy(false);
                            }
                          })}
                          maxLength={1}
                          inputMode="numeric"
                          pattern="\d*"
                          aria-label={`Digit ${i+1}`}
                        />
                      ))}
                    </div>
                    <button className={styles.btnPrimary} disabled={changeBusy} onClick={async ()=>{ const code = reauthOtp.join(''); if (code.length!==6) { setChangeMsg('Enter the 6-digit code'); return; } setChangeBusy(true); setChangeMsg(''); try { await authService.confirmReauthPhone(code); setChangeStep('newPhone'); setChangeMsg('Verified. Enter a new PH number.'); } catch(err){ setChangeMsg(err?.message || 'Invalid code.'); } finally { setChangeBusy(false); } }}>Confirm</button>
                    <button className={styles.linkBtn} disabled={changeBusy || smsCooldown>0} onClick={async ()=>{ setChangeBusy(true); setChangeMsg(''); try { const e164 = toE164(phone); await authService.startReauthPhone(e164, showReauthCaptcha ? 'change-phone-reauth-recaptcha-visible' : 'change-phone-reauth-recaptcha', showReauthCaptcha ? { size: 'normal' } : { size: 'invisible' }); setSmsCooldown(60); reauthRefs.current?.[0]?.current?.focus(); } catch(err){ setChangeMsg(err?.message || 'Failed to send code'); if (String(err?.message||'').toLowerCase().includes('captcha') || String(err?.message||'').toLowerCase().includes('invalid-app-credential')) { setShowReauthCaptcha(true); } } finally { setChangeBusy(false); } }}>
                      {smsCooldown>0 ? `Resend in ${smsCooldown}s` : 'Send code'}
                    </button>
                  </div>
                </>
              )}

              {changeStep === 'newPhone' && (
                <>
                  <label>New PH phone number</label>
                  <input className={styles.input} type="tel" inputMode="numeric" placeholder="+63 9XX XXX XXXX" value={newPhone} onChange={(e)=> setNewPhone(formatPhone(e.target.value))} />
                  {showNewCaptcha && <div style={{ marginTop: 8 }}><div id="change-phone-new-recaptcha-visible"></div><div className={styles.muted} style={{ marginTop: 4 }}>Solve the reCAPTCHA then resend.</div></div>}
                  <div className={styles.modalActions}>
                    <button className={styles.btnSecondary} onClick={()=> setChangePhoneOpen(false)}>Cancel</button>
                    <button className={styles.btnPrimary} disabled={changeBusy || !isValidE164PH(toE164(newPhone))} onClick={async ()=>{
                      setChangeBusy(true); setChangeMsg('');
                      try {
                        const e164 = toE164(newPhone);
                        if (!/^\+63\d{10}$/.test(e164)) throw new Error('PH numbers only (+63)');
                        // Ensure not used by other accounts
                        const matches = await authService.findUsersByPhone(e164);
                        const uid = authService.currentUser?.uid;
                        const conflict = matches.find(m=>m.uid !== uid);
                        if (conflict) throw new Error('This phone is already linked to another account.');
                        await authService.startUpdatePhone(e164, showNewCaptcha ? 'change-phone-new-recaptcha-visible' : 'change-phone-new-recaptcha', showNewCaptcha ? { size: 'normal' } : { size: 'invisible' });
                        setChangeStep('confirmNew');
                        setNewCooldown(60);
                        setTimeout(()=> newOtpRefs.current?.[0]?.current?.focus(), 50);
                      } catch(err) {
                        setChangeMsg(err?.message || 'Failed to send code');
                        if (String(err?.message||'').toLowerCase().includes('captcha') || String(err?.message||'').toLowerCase().includes('invalid-app-credential')) { setShowNewCaptcha(true); }
                      } finally { setChangeBusy(false); }
                    }}>Send code</button>
                  </div>
                </>
              )}

              {changeStep === 'confirmNew' && (
                <>
                  <p className={styles.muted}>Enter the 6-digit code sent to <strong>{maskPhoneDisplay(newPhone)}</strong>.</p>
                  <div className={styles.inlineActions}>
                    <div className={styles.verificationInputs}>
                      {newOtp.map((d, i) => (
                        <input
                          key={i}
                          ref={newOtpRefs.current[i]}
                          className={styles.codeInput}
                          value={d}
                          onChange={(e)=> handleCodeInputChange(
                            setNewOtp,
                            i,
                            e.target.value,
                            newOtpRefs,
                            async (code) => { await confirmNewPhone(code); }
                          )}
                          onKeyDown={(e)=> handleCodeKeyDown(newOtpRefs, newOtp, i, e, async ()=>{ const code = newOtp.join(''); if (code.length===6) await confirmNewPhone(code); })}
                          onPaste={(e)=> handleCodePaste(setNewOtp, newOtpRefs, e, async (code) => { await confirmNewPhone(code); })}
                          maxLength={1}
                          inputMode="numeric"
                          pattern="\d*"
                          aria-label={`Digit ${i+1}`}
                        />
                      ))}
                    </div>
                    <button className={styles.btnPrimary} disabled={changeBusy} onClick={async ()=>{ await confirmNewPhone(); }}>Confirm</button>
                    <button className={styles.linkBtn} disabled={changeBusy || newCooldown>0} onClick={async ()=>{ setChangeBusy(true); setChangeMsg(''); try { const e164 = toE164(newPhone); await authService.startUpdatePhone(e164, showNewCaptcha ? 'change-phone-new-recaptcha-visible' : 'change-phone-new-recaptcha', showNewCaptcha ? { size: 'normal' } : { size: 'invisible' }); setNewCooldown(60); } catch(err){ setChangeMsg(err?.message || 'Failed to resend'); } finally { setChangeBusy(false); }}}>
                      {newCooldown>0 ? `Resend in ${newCooldown}s` : 'Resend code'}
                    </button>
                  </div>
                </>
              )}

              {changeMsg && <p className={styles.muted} style={{marginTop:8}}>{changeMsg}</p>}
              {/* Invisible reCAPTCHA containers */}
              <div id="change-phone-reauth-recaptcha" style={{ position:'absolute', left:-9999, bottom:0 }} />
              <div id="change-phone-new-recaptcha" style={{ position:'absolute', left:-9999, bottom:0 }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
