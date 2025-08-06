import React from "react";
import styles from "./ForgetPasswordForm.module.css";
import { Activity } from "lucide-react";

export function ForgetPasswordForm({ onSwitch }) {
  return (
    <div className={styles.formBox}>
      <div className={styles.formHeader}>
        <div className={styles.logo}>
          <Activity className={styles.logoIconLarge} />
          <h1>
            PrimeLab <span>Appoint</span>
          </h1>
        </div>
        <p className={styles.tagline}>Reset your password</p>
      </div>

      <div className={styles.infoCard}>
        <div className={styles.infoIcon}>
          <i className="fas fa-key"></i>
        </div>
        <div className={styles.infoContent}>
          <h3>Password Recovery</h3>
          <p>
            We’ll send a verification code to your email to help you reset your
            password securely.
          </p>
        </div>
      </div>

      <form>
        <div className={styles.formIconHeader}>
          <div className={styles.formIconCircle}>
            <i className="fas fa-key"></i>
          </div>
          <h3>Forgot Password?</h3>
          <p>
            Enter your email address and we’ll send you a verification code.
          </p>
        </div>

        <div className={styles.inputGroup}>
          <div className={styles.inputIcon}>
            <i className="fas fa-envelope"></i>
          </div>
          <div className={styles.inputField}>
            <input type="email" required />
            <label>Email Address</label>
          </div>
        </div>

        <button type="submit" className={`${styles.btn} ${styles.forgotBtn}`}>
          <span className={styles.btnText}>Send Verification Code</span>
          <span className={styles.btnIcon}>
            <i className="fas fa-paper-plane"></i>
          </span>
        </button>

        <div className={styles.toggleLink}>
          <p>
            Remember your password?{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault(); 
                onSwitch("login"); 
              }}
            >
              Back to login
            </a>
          </p>
        </div>
      </form>
    </div>
  );
}
