import React, { useState } from "react";
import styles from "./LoginForm.module.css";
import { Activity } from "lucide-react";

export function LoginForm({ onSwitch }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log({ username, password, remember });
    // Later: Connect to Firebase or other auth system
  };

  return (
    <>
      <form onSubmit={handleSubmit} id="login-form" className={styles.formBox}>
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
            <i className="fas fa-user"></i>
          </div>
          <div className={styles.inputField}>
            <input
              type="text"
              id="login-username"
              name="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
            <label htmlFor="login-username">Username</label>
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

        <button type="submit" className={`${styles.btn} ${styles.loginBtn}`}>
          <span className={styles.btnText}>Log In</span>
          <span className={styles.btnIcon}>
            <i className="fas fa-arrow-right"></i>
          </span>
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
    </>
  );
}
