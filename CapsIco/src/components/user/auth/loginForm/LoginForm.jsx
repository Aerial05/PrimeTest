import React, { useState } from "react";
import styles from "./LoginForm.module.css";
import { Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence, browserSessionPersistence, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../../../../config/firebase-config";

export function LoginForm({ onSwitch }) {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeName, setWelcomeName] = useState("");
  const [welcomeHide, setWelcomeHide] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await setPersistence(
        auth,
        remember ? browserLocalPersistence : browserSessionPersistence
      );
      await signInWithEmailAndPassword(auth, email, password);
      const user = auth.currentUser;
      const name = user?.displayName || (user?.email ? user.email.split("@")[0] : "");
      setWelcomeName(name);
      setShowWelcome(true);
      // Trigger fade-out then navigate
      setTimeout(() => setWelcomeHide(true), 2400);
      setTimeout(() => navigate("/", { replace: true }), 3400);
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
      await setPersistence(
        auth,
        remember ? browserLocalPersistence : browserSessionPersistence
      );
      const provider = new GoogleAuthProvider();
      await signInWithPopup(auth, provider);
      const user = auth.currentUser;
      const name = user?.displayName || (user?.email ? user.email.split("@")[0] : "");
      setWelcomeName(name);
      setShowWelcome(true);
      setTimeout(() => setWelcomeHide(true), 2400);
      setTimeout(() => navigate("/", { replace: true }), 3400);
    } catch (err) {
      setError(err.message || "Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} id="login-form" className={`${styles.formBox} ${styles.fadeIn}`}>
        <div className={styles.formHeader}>
          <div className={styles.logo}>
            <Activity className={styles.logoIconLarge} />
            <h1>
              PrimeLab <span>Appoint</span>
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

        <div className={styles.inputGroup}>
          <div className={styles.inputIcon}>
            <i className="fas fa-envelope"></i>
          </div>
          <div className={styles.inputField}>
            <input
              type="email"
              id="login-email"
              name="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
            <label htmlFor="login-email">Email</label>
          </div>
        </div>

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
              <i
                className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`}
              ></i>
            </span>
          </div>
        </div>

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

        {error && <p className={styles.errorText}>{error}</p>}

        <button type="submit" disabled={loading} className={`${styles.btn} ${styles.loginBtn}`}>
          <span className={styles.btnText}>{loading ? "Logging in..." : "Log In"}</span>
          <span className={styles.btnIcon}>
            <i className="fas fa-arrow-right"></i>
          </span>
        </button>

        <div className={styles.divider}>
          <span className={styles.dividerLine}></span>
          <span className={styles.dividerText}>or</span>
          <span className={styles.dividerLine}></span>
        </div>

        <button
          type="button"
          onClick={handleGoogle}
          disabled={loading}
          className={`${styles.oauthBtn} ${styles.googleBtn}`}
        >
          <span className={styles.oauthIcon}>
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48" aria-hidden>
              <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303C33.483 32.674 29.14 36 24 36 17.373 36 12 30.627 12 24s5.373-12 12-12c3.059 0 5.842 1.156 7.961 3.039l5.657-5.657C33.847 6.083 29.165 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.651-.389-3.917z"/>
              <path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.294 16.161 18.771 12 24 12c3.059 0 5.842 1.156 7.961 3.039l5.657-5.657C33.847 6.083 29.165 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
              <path fill="#4CAF50" d="M24 44c5.083 0 9.697-1.947 13.192-5.11l-6.095-5.168C29.06 35.915 26.664 36.8 24 36.8 18.883 36.8 14.554 33.5 12.717 28.999l-6.49 5.006C9.5 39.662 16.227 44 24 44z"/>
              <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-1.353 3.168-4.364 5.8-7.303 5.8-1.963 0-3.74-.672-5.14-1.8l-6.49 5.006C18.554 39.5 21.883 41.2 26 41.2c7.062 0 13.053-4.772 15.198-11.2.552-1.705.844-3.534.844-5.417 0-1.341-.138-2.651-.431-3.917z"/>
            </svg>
          </span>
          <span className={styles.btnText}>Continue with Google</span>
        </button>

        <div className={styles.toggleLink}>
          <p>
            Don’t have an account?{" "}
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
            <div className={styles.welcomeSub}>Preparing your dashboard…</div>
          </div>
        </div>
      )}
    </>
  );
}
