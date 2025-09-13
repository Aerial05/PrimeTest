import React, { useEffect, useState, useRef } from "react";
import styles from "./LoginForm.module.css";
import { Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import {
  signInWithEmailAndPassword,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  GoogleAuthProvider,
  signInWithPopup,
  FacebookAuthProvider,
  signInWithCredential,
} from "firebase/auth";
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

  // Facebook SDK state
  const [fbReady, setFbReady] = useState(false);
  const fbInitRef = useRef(false);

  // Load and init Facebook SDK once
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (fbInitRef.current) return;

    const appId = import.meta.env.VITE_FACEBOOK_APP_ID || "YOUR_FACEBOOK_APP_ID";
    const apiVersion = import.meta.env.VITE_FACEBOOK_API_VERSION || "v19.0";

    function initFB() {
      if (!window.FB) return;
      try {
        window.FB.init({ appId, cookie: true, xfbml: false, version: apiVersion });
        setFbReady(true);
      } catch (e) {
        // ignore init error, user can retry click
      }
    }

    if (window.FB) {
      initFB();
      fbInitRef.current = true;
      return;
    }

    if (!document.getElementById("facebook-jssdk")) {
      const js = document.createElement("script");
      js.id = "facebook-jssdk";
      js.src = "https://connect.facebook.net/en_US/sdk.js";
      js.async = true;
      js.defer = true;
      js.onload = () => initFB();
      document.body.appendChild(js);
    } else {
      const t = setTimeout(initFB, 300);
      return () => clearTimeout(t);
    }

    fbInitRef.current = true;
  }, []);

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
      setTimeout(() => setWelcomeHide(true), 2400);
      setTimeout(() => navigate("/", { replace: true }), 3400);
    } catch (err) {
      setError(err.message || "Failed to log in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const completeWelcomeAndNavigate = () => {
    const user = auth.currentUser;
    const name = user?.displayName || (user?.email ? user.email.split("@")[0] : "");
    setWelcomeName(name);
    setShowWelcome(true);
    setTimeout(() => setWelcomeHide(true), 2400);
    setTimeout(() => navigate("/", { replace: true }), 3400);
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
      completeWelcomeAndNavigate();
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
      await setPersistence(
        auth,
        remember ? browserLocalPersistence : browserSessionPersistence
      );

      if (!window.FB) {
        throw new Error("Facebook SDK not loaded. Please try again.");
      }

      const getAccessToken = () =>
        new Promise((resolve, reject) => {
          window.FB.getLoginStatus((response) => {
            if (response?.status === "connected") {
              return resolve(response.authResponse?.accessToken);
            }
            window.FB.login(
              (resp) => {
                if (resp?.status === "connected") {
                  resolve(resp.authResponse?.accessToken);
                } else {
                  reject(new Error("Facebook login was cancelled or failed."));
                }
              },
              { scope: "public_profile,email" }
            );
          });
        });

      const accessToken = await getAccessToken();
      if (!accessToken) throw new Error("No Facebook access token.");

      const credential = FacebookAuthProvider.credential(accessToken);
      await signInWithCredential(auth, credential);
      completeWelcomeAndNavigate();
    } catch (err) {
      setError(err.message || "Facebook sign-in failed. Please try again.");
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
              <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
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
            disabled={loading || !fbReady}
            className={`${styles.oauthBtn} ${styles.facebookBtn}`}
            aria-label="Continue with Facebook"
            title={!fbReady ? "Loading Facebook SDK..." : "Continue with Facebook"}
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
