import React, { useState } from "react";
import styles from "./ResetPasswordForm.module.css";
import { Activity } from 'lucide-react';

export function ResetPasswordForm({ onSwitch }) {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setError("");
    // In production: call Firebase or backend to update password here
    alert("Password has been reset!");
    onSwitch("login");
  };

  return (
    <div className={styles.formBox}>
      <div className={styles.formHeader}>
        <div className={styles.logo}>
          <Activity className={styles.logoIconLarge} />
          <h1>
            PrimeLab <span>Appoint</span>
          </h1>
        </div>
        <p className={styles.tagline}>Set Your New Password</p>
      </div>

      <div className={styles.infoCard}>
        <div className={styles.infoIcon}>
          <i className="fas fa-lock-open"></i>
        </div>
        <div className={styles.infoContent}>
          <h3>Secure Your Account</h3>
          <p>Please enter your new password below and confirm it to finish resetting your account.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className={styles.inputGroup}>
          <div className={styles.inputIcon}>
            <i className="fas fa-lock"></i>
          </div>
          <div className={styles.inputField}>
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <label>New Password</label>
            <span
              className={styles.passwordToggle}
              onClick={() => setShowPassword(!showPassword)}
            >
              <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
            </span>
          </div>
        </div>

        <div className={styles.inputGroup}>
          <div className={styles.inputIcon}>
            <i className="fas fa-lock"></i>
          </div>
          <div className={styles.inputField}>
            <input
              type={showConfirm ? "text" : "password"}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
            <label>Confirm New Password</label>
            <span
              className={styles.passwordToggle}
              onClick={() => setShowConfirm(!showConfirm)}
            >
              <i className={`fas ${showConfirm ? "fa-eye-slash" : "fa-eye"}`}></i>
            </span>
          </div>
        </div>

        {error && <p className={styles.errorText}>{error}</p>}

        <button type="submit" className={`${styles.btn} ${styles.resetBtn}`}>
          <span className={styles.btnText}>Reset Password</span>
          <span className={styles.btnIcon}>
            <i className="fas fa-redo-alt"></i>
          </span>
        </button>

        <div className={styles.toggleLink}>
          <p>
            <a href="#" onClick={() => onSwitch("login")}>
              Back to login
            </a>
          </p>
        </div>
      </form>
    </div>
  );
}
