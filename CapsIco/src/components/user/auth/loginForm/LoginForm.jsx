import React, { useState, useRef, useEffect } from "react";
import { formatPHDisplay, toE164PH } from "/src/utils/phone";
import styles from "./LoginForm.module.css";
import { Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import authService from "../../../../services/AuthService";

export function LoginForm({ onSwitch }) {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeName, setWelcomeName] = useState("");
  const [welcomeSubtitle, setWelcomeSubtitle] = useState("Preparing your dashboard.");
  const [welcomeHide, setWelcomeHide] = useState(false);
  const [showRolePrompt, setShowRolePrompt] = useState(false);

  // Phone login state
  const [usePhoneLogin, setUsePhoneLogin] = useState(false);
  const [phoneDisplay, setPhoneDisplay] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const recaptchaBtnRef = useRef(null);
  const [showVisibleCaptcha, setShowVisibleCaptcha] = useState(false);
  const otpRefs = useRef(Array.from({ length: 6 }, () => React.createRef()));
  const [resendCooldown, setResendCooldown] = useState(0);

  useEffect(() => {
    if (otpSent) {
      setTimeout(() => otpRefs.current?.[0]?.current?.focus(), 50);
    }
  }, [otpSent]);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => setResendCooldown((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  const setPreferredDashboard = (preference) => {
    if (typeof window !== "undefined") {
      localStorage.setItem("preferredDashboard", preference);
      try {
        window.dispatchEvent(new CustomEvent('preferred-dashboard-changed', { detail: preference }));
      } catch (_) {}
    }
  };

  const completeWelcomeAndNavigate = (destination = "/") => {
    const user = authService.currentUser;
    const name = authService.getDisplayName(user);
    setWelcomeName(name);
    setWelcomeSubtitle("Preparing your dashboard.");
    setShowWelcome(true);
    setTimeout(() => setWelcomeHide(true), 2400);
    setTimeout(() => navigate(destination, { replace: true }), 3400);
  };
      // Handles post-sign-in logic including role check and navigation
      // Refresh the page if admin to load admin UI
  const handlePostSignIn = async () => {
    try {
      const role = await authService.getUserRole();
      if (role === "admin") {
        setPreferredDashboard("admin");
        // Allow the login route to render while logged in so the welcome overlay shows
        try { if (typeof window !== 'undefined') localStorage.setItem('allowLoginWelcome', '1'); } catch (_) {}
        // Show the welcome overlay for admin as well, then go to admin dashboard
        const user = authService.currentUser;
        const name = authService.getDisplayName(user);
        setWelcomeName(name);
        setWelcomeSubtitle("Preparing your Admin Dashboard.");
        setShowWelcome(true);
        setTimeout(() => setWelcomeHide(true), 2400);
        setTimeout(() => {
          navigate('/admin-dashboard', { replace: true });
          // Clear the allow flag shortly after navigation
          setTimeout(() => { try { if (typeof window !== 'undefined') localStorage.removeItem('allowLoginWelcome'); } catch (_) {} }, 150);
        }, 3400);
        return;
      }
    } catch (roleErr) {
      console.warn("Failed to determine user role", roleErr);
    }
    setPreferredDashboard("user");
    completeWelcomeAndNavigate("/");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      if (usePhoneLogin) {
        // For phone login, sending OTP is handled by a separate action
        await handleSendOtp();
        return;
      }
  await authService.signInWithIdentifier({ identifier, password, remember });
      await handlePostSignIn();
    } catch (err) {
      setError(err.message || "Failed to log in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setError("");
    setLoading(true);
    try {
      await authService.signInWithProvider("google", { remember });
      await handlePostSignIn();
    } catch (err) {
      setError(err.message || "Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleFacebook = async () => {
    setError("");
    setLoading(true);
    try {
      await authService.signInWithProvider("facebook", { remember });
      await handlePostSignIn();
    } catch (err) {
      setError(err.message || "Facebook sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Phone helpers (PH +63 formatter/E.164)
  const formatPhone = (value) => formatPHDisplay(value);
  const toE164 = (value) => toE164PH(value);

  // Initialize invisible reCAPTCHA on a hidden button
  useEffect(() => {
    if (!usePhoneLogin) return;
    const id = "login-phone-recaptcha";
    // Create verifier once when phone login toggles on
    try {
      authService.getOrCreateRecaptchaVerifier(id, {
        size: "invisible",
        callback: () => {},
        "expired-callback": () => {},
      });
    } catch (_) {}
  }, [usePhoneLogin]);

  const handleSendOtp = async () => {
    setError("");
    const e164 = toE164(phoneDisplay);
    if (!e164) {
      setError("Enter a valid phone number");
      return;
    }
    if (!/^\+63\d{10}$/.test(e164)) {
      setError('Phone login is available for PH (+63) numbers only.');
      return;
    }
    setLoading(true);
    try {
      // Enforce that the phone exists in DB and is verified before allowing OTP
      await authService.assertVerifiedPhoneForLogin(e164);
      const id = showVisibleCaptcha ? 'login-phone-recaptcha-visible' : 'login-phone-recaptcha';
      await authService.startPhoneSignIn(e164, id, showVisibleCaptcha ? { size: 'normal' } : { size: 'invisible' });
      setOtpSent(true);
      setResendCooldown(60);
    } catch (err) {
      setError(err.message || "Failed to send OTP. Try again.");
      if (String(err?.code || err?.message || '').toLowerCase().includes('captcha') || String(err?.code || err?.message || '').toLowerCase().includes('invalid-app-credential')) {
        setShowVisibleCaptcha(true);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (idx, val) => {
    const v = (val || "").replace(/\D/g, "").slice(-1);
    const next = [...otpCode];
    next[idx] = v;
    setOtpCode(next);
    if (v && idx < otpRefs.current.length - 1) {
      otpRefs.current[idx + 1]?.current?.focus();
    }
  };

  const handleOtpKeyDown = (idx, e) => {
    if (e.key === 'Backspace') {
      if (!otpCode[idx] && idx > 0) {
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
      const code = otpCode.join('');
      if (code.length === 6) {
        handleConfirmOtp(e);
      }
    }
  };

  const handleOtpPaste = (e) => {
    const text = (e.clipboardData || window.clipboardData)?.getData('text') || '';
    const digits = text.replace(/\D/g, '').slice(0, 6).split('');
    if (!digits.length) return;
    e.preventDefault();
    const next = [...otpCode];
    for (let i = 0; i < 6; i += 1) next[i] = digits[i] || '';
    setOtpCode(next);
    const lastIdx = Math.min(digits.length - 1, 5);
    if (lastIdx >= 0) otpRefs.current[lastIdx]?.current?.focus();
  };

  const handleConfirmOtp = async (e) => {
    e.preventDefault();
    setError("");
    const code = otpCode.join("");
    if (code.length !== 6) {
      setError("Please enter the 6-digit code");
      return;
    }
    setLoading(true);
    try {
      await authService.confirmPhoneCode(code);
      await handlePostSignIn();
    } catch (err) {
      setError(err.message || "Invalid code. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChooseDashboard = (path) => {
    if (path === "/") {
      setPreferredDashboard("user");
    } else {
      setPreferredDashboard("admin");
    }
    setShowRolePrompt(false);
    completeWelcomeAndNavigate(path);
  };

  return (
    <>
  <form onSubmit={handleSubmit} id="login-form" className={`${styles.formBox} ${styles.fadeIn}`}>
        <div className={styles.formHeader}>
          <div className={styles.logo}>
            <Activity className={styles.logoIconLarge} />
            <h1>
              PrimeLab <span className="brand-gradient-text">Appoint</span>
            </h1>
          </div>
          <p className={styles.tagline}>Your health, Our priority</p>
        </div>

        <div className={styles.infoCard}>
          <div className={styles.infoIcon}>
            <i className="fas fa-calendar-check"></i>
          </div>
          <div className={styles.infoContent}>
            <h3>Welcome Back!</h3>
            <p>
              Log in to manage your appointments, view test results, and connect
              with healthcare professionals.
            </p>
          </div>
        </div>

        {!usePhoneLogin && (
        <div className={styles.inputGroup}>
          <div className={styles.inputIcon}>
            <i className="fas fa-envelope"></i>
          </div>
          <div className={styles.inputField}>
            <input
              type="text"
              id="login-identifier"
              name="identifier"
              autoComplete="username email"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              required
            />
            <label htmlFor="login-identifier">Email or Username</label>
          </div>
        </div>
        )}

        {!usePhoneLogin && (
        <div className={styles.inputGroup}>
          <div className={styles.inputIcon}>
            <i className="fas fa-lock"></i>
          </div>
          <div className={styles.inputField}>
            <input
              type={showPassword ? "text" : "password"}
              id="login-password"
              name="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <label htmlFor="login-password">Password</label>
            <span
              className={styles.passwordToggle}
              onClick={() => setShowPassword(!showPassword)}
            >
              <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
            </span>
          </div>
        </div>
        )}

        {usePhoneLogin && (
          <>
            <div className={styles.inputGroup}>
              <div className={styles.inputIcon}>
                <i className="fas fa-phone"></i>
              </div>
              <div className={styles.inputField}>
                <input
                  type="tel"
                  inputMode="numeric"
                  maxLength={16}
                  value={phoneDisplay}
                  onChange={(e) => setPhoneDisplay(formatPhone(e.target.value))}
                  placeholder="+63 912 345 6789"
                  required
                />
                <label>Phone Number</label>
              </div>
            </div>
            {showVisibleCaptcha && (
              <div style={{ marginTop: 8 }}>
                <div id="login-phone-recaptcha-visible"></div>
                <div className={styles.muted} style={{ marginTop: 4 }}>Please solve the reCAPTCHA and try sending the code again.</div>
              </div>
            )}
            {!otpSent ? (
                <button type="button" disabled={loading || toE164(phoneDisplay).length !== 13} onClick={handleSendOtp} className={`${styles.btn} ${styles.loginBtn}`}>
                <span className={styles.btnText}>{loading ? "Sending..." : "Send OTP"}</span>
                <span className={styles.btnIcon}>
                  <i className="fas fa-sms"></i>
                </span>
              </button>
            ) : (
              <>
                <div className={styles.verificationInputs}>
                  {otpCode.map((d, idx) => (
                    <input
                      key={idx}
                      ref={otpRefs.current[idx]}
                      type="text"
                      maxLength={1}
                      value={d}
                      onChange={(e) => handleOtpChange(idx, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                      onPaste={handleOtpPaste}
                      className={styles.codeInput}
                      inputMode="numeric"
                      pattern="\d*"
                      aria-label={`Digit ${idx+1}`}
                    />
                  ))}
                </div>
                <button type="button" disabled={loading} onClick={handleConfirmOtp} className={`${styles.btn} ${styles.loginBtn}`}>
                  <span className={styles.btnText}>{loading ? "Verifying..." : "Verify & Log in"}</span>
                  <span className={styles.btnIcon}>
                    <i className="fas fa-check-circle"></i>
                  </span>
                </button>
                <div className={styles.toggleLink}>
                  <a href="#" onClick={(e)=>{ e.preventDefault(); if (resendCooldown===0) handleSendOtp(); }} aria-disabled={resendCooldown>0}>
                    {resendCooldown>0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                  </a>
                </div>
              </>
            )}
            {/* Hidden button id for invisible reCAPTCHA binding */}
            <button type="button" ref={recaptchaBtnRef} style={{ display: 'none' }}>recaptcha</button>
          </>
        )}

        {!usePhoneLogin && (
        <div className={styles.rememberForgot}>
          <div className={styles.rememberMe}>
            <input
              type="checkbox"
              id="remember"
              name="remember"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
            />
            <label htmlFor="remember">Remember me</label>
          </div>
          <button
            type="button"
            className={styles.forgotLink}
            onClick={() => onSwitch("forgot")}
          >
            Forgot Password?
          </button>
        </div>
        )}

        {error && <p className={styles.errorText}>{error}</p>}

        {!usePhoneLogin && (
          <button type="submit" disabled={loading} className={`${styles.btn} ${styles.loginBtn}`}>
            <span className={styles.btnText}>{loading ? "Logging in..." : "Log In"}</span>
            <span className={styles.btnIcon}>
              <i className="fas fa-arrow-right"></i>
            </span>
          </button>
        )}

        <div className={styles.divider}>
          <span className={styles.dividerLine}></span>
          <span className={styles.dividerText}>Log In or Register</span>
          <span className={styles.dividerLine}></span>
        </div>

        <div className={styles.oauthRow}>
          <button
            type="button"
            onClick={handleGoogle}
            disabled={loading}
            className={`${styles.oauthBtn} ${styles.googleBtn}`}
            aria-label="Continue with Google"
            title="Continue with Google"
          >
            <span className={styles.oauthIcon}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48" aria-hidden>
                <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.483 32.674 29.14 36 24 36 17.373 36 12 30.627 12 24s5.373-12 12-12c3.059 0 5.842 1.156 7.961 3.039l5.657-5.657C33.847 6.083 29.165 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.294 16.161 18.771 12 24 12c3.059 0 5.842 1.156 7.961 3.039l5.657-5.657C33.847 6.083 29.165 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                <path fill="#4CAF50" d="M24 44c5.083 0 9.697-1.947 13.192-5.11l-6.095-5.168C29.06 35.915 26.664 36.8 24 36.8 18.883 36.8 14.554 33.5 12.717 28.999l-6.49 5.006C9.5 39.662 16.227 44 24 44z"/>
                <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-1.353 3.168-4.364 5.8-7.303 5.8-1.963 0-3.74-.672-5.14-1.8l-6.49 5.006C18.554 39.5 21.883 41.2 26 41.2c7.062 0 13.053-4.772 15.198-11.2.552-1.705.844-3.534.844-5.417 0-1.341-.138-2.651-.431-3.917z"/>
              </svg>
            </span>
            <span className={styles.btnText}>Google</span>
          </button>

          <button
            type="button"
            onClick={handleFacebook}
            disabled={loading}
            className={`${styles.oauthBtn} ${styles.facebookBtn}`}
            aria-label="Continue with Facebook"
            title="Continue with Facebook"
          >
            <span className={styles.oauthIcon}>
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M22 12.06C22 6.505 17.523 2 12 2S2 6.505 2 12.06c0 5.022 3.657 9.194 8.438 10.007v-7.07H7.898v-2.937h2.54V9.845c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.47h-1.26c-1.243 0-1.63.776-1.63 1.57v1.888h2.773l-.443 2.937h-2.33v7.07C18.343 21.253 22 17.081 22 12.06Z" fill="#1877F2"/>
                <path d="M15.557 16.997l.443-2.937h-2.773v-1.888c0-.794.387-1.57 1.63-1.57h1.26v-2.47s-1.144-.195-2.238-.195c-2.285 0-3.777 1.384-3.777 3.89v2.215H7.898v2.937h2.54v7.07a10.083 10.083 0 003.123 0v-7.07h1.996Z" fill="#fff"/>
              </svg>
            </span>
            <span className={styles.btnText}>Facebook</span>
          </button>
        </div>

        <div className={styles.toggleLink}>
          <p>
            {usePhoneLogin ? (
              <a href="#" onClick={(e) => { e.preventDefault(); setUsePhoneLogin(false); }}>Use email & password instead</a>
            ) : (
              <a href="#" onClick={(e) => { e.preventDefault(); setUsePhoneLogin(true); }}>Use phone (OTP) instead</a>
            )}
          </p>
        </div>

        <div className={styles.toggleLink}>
          <p>
            Don't have an account?{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onSwitch("register");
              }}
            >
              Register here
            </a>
          </p>
        </div>
      </form>

      {showRolePrompt && (
        <div className={styles.rolePromptOverlay}>
          <div className={styles.rolePromptCard}>
            <h2>Welcome, Admin!</h2>
            <p>Where would you like to go?</p>
            <div className={styles.rolePromptButtons}>
              <button
                type="button"
                className={styles.rolePromptUser}
                onClick={() => handleChooseDashboard("/")}
                disabled={loading}
              >
                User Dashboard
              </button>
              <button
                type="button"
                className={styles.rolePromptAdmin}
                onClick={() => handleChooseDashboard("/admin-dashboard")}
                disabled={loading}
              >
                Admin Dashboard
              </button>
            </div>
          </div>
        </div>
      )}

      {showWelcome && (
        <div className={`${styles.welcomeOverlay} ${welcomeHide ? styles.hide : ""}`}>
          <div className={styles.welcomeCard}>
            <div className={styles.welcomeLogoWrap}>
              <Activity className={styles.welcomeLogo} />
            </div>
            <div className={styles.welcomeTextBlock}>
              <h2 className={styles.welcomeTitle}>Welcome to PrimeLab Appoint</h2>
              <div className={styles.welcomeName}>{welcomeName}</div>
            </div>
            <div className={styles.welcomeSub}>{welcomeSubtitle}</div>
          </div>
        </div>
      )}
    </>
  );
}
