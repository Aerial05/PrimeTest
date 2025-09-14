import React, { useEffect, useMemo, useState } from 'react';
import styles from './SettingsContentUser.module.css';
import { auth, usersDB } from '/src/config/firebase-config';
import { onAuthStateChanged, updateProfile, sendEmailVerification, reload, signOut } from 'firebase/auth';
import AuthService from '/src/services/AuthService';
import { get, ref, set, update } from 'firebase/database';
import { useNavigate } from 'react-router-dom';

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
  const [joinedDate, setJoinedDate] = useState('');

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
        if (created) {
          setJoinedDate(created.toISOString().slice(0, 10));
        }

        // Load DB profile
        const snap = await get(ref(usersDB, `users/${uid}`));
        const dbv = snap.exists() ? snap.val() : {};

        setFirstName(dbv.firstName ?? first);
        setLastName(dbv.lastName ?? last);
        const uname = dbv.username ?? '';
        setUsername(uname);
        setPrevUsername(uname);
        const rawPhone = dbv.phone ?? (u.phoneNumber || '');
        setPhone(formatPhone(rawPhone));
      } catch (e) {
        setError('Failed to load profile');
      } finally {
        setLoading(false);
      }
    });
    return () => unsub();
  }, []);

  const fullName = useMemo(() => `${firstName} ${lastName}`.trim(), [firstName, lastName]);
  const isPasswordProvider = useMemo(() => {
    return !!(user?.providerData || []).some(p => p.providerId === 'password');
  }, [user]);

  // PH format: +63 9XX XXX XXXX for display, store E.164 +639XXXXXXXXX
  const formatPhone = (value) => {
    const digits = (value || '').replace(/\D/g, '');
    let rest = digits;
    if (rest.startsWith('63')) rest = rest.slice(2);
    else if (rest.startsWith('0')) rest = rest.slice(1);
    rest = rest.replace(/^(?!9)/, '');
    rest = rest.slice(0, 10);
    const p1 = rest.slice(0, 3);
    const p2 = rest.slice(3, 6);
    const p3 = rest.slice(6, 10);
    const tail = [p1, p2, p3].filter(Boolean).join(' ');
    return '+63 ' + tail;
  };

  const toE164 = (value) => {
    const digits = (value || '').replace(/\D/g, '');
    let rest = digits;
    if (rest.startsWith('63')) rest = rest.slice(2);
    else if (rest.startsWith('0')) rest = rest.slice(1);
    if (!rest) return '';
    rest = rest.slice(0, 10);
    return '+63' + rest;
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
        joinedAt: user.metadata?.creationTime || joinedDate,
        updatedAt: new Date().toISOString(),
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
      await AuthService.changePassword(auth, curPass, newPass);
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
          await update(ref(usersDB, `users/${cur.uid}`), { email: cur.email, updatedAt: new Date().toISOString() });
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
              <input type="email" id="email" value={email} disabled />
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
                value={phone}
                onChange={(e)=> setPhone(formatPhone(e.target.value))}
                placeholder="+63 912 345 6789"
                disabled={loading}
              />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="joinDate">Join Date</label>
              <input type="date" id="joinDate" value={joinedDate} disabled />
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
                        await update(ref(usersDB, `users/${uid}`), { email: newEmail, updatedAt: new Date().toISOString() });
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
                          const uid = user.uid; await update(ref(usersDB, `users/${uid}`), { email: target, updatedAt: new Date().toISOString() });
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
    </div>
  );
}
