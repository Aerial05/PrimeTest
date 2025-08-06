
import React, { useState } from "react";
import styles from "./RegisterForm.module.css";
import { Activity } from 'lucide-react';

export function RegisterForm({ onSwitch }) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

    
  return (
    <div className={styles.formBox}>
      <div className={styles.formHeader}>
        <div className={styles.logo}>
          <Activity className={styles.logoIconLarge} />
          <h1>
            PrimeLab <span>Appoint</span>
          </h1>
        </div>
        <p className={styles.tagline}>Create your account</p>
      </div>

      <div className={`${styles.infoCard} ${styles.compact}`}>
        <div className={styles.infoIcon}>
          <i className="fas fa-user-plus"></i>
        </div>
        <div className={styles.infoContent}>
          <h3>Join PrimeLab Appoint</h3>
          <p>Create an account to schedule appointments, receive reminders, and access your medical records securely.</p>
        </div>
      </div>

      <form>
        {/* Name Row */}
        <div className={styles.formRow}>
          <div className={`${styles.inputGroup} ${styles.half}`}>
            <div className={styles.inputIcon}>
              <i className="fas fa-user"></i>
            </div>
            <div className={styles.inputField}>
              <input type="text" required />
              <label>First Name</label>
            </div>
          </div>

          <div className={`${styles.inputGroup} ${styles.half}`}>
            <div className={styles.inputIcon}>
              <i className="fas fa-user"></i>
            </div>
            <div className={styles.inputField}>
              <input type="text" required />
              <label>Middle Name</label>
            </div>
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={`${styles.inputGroup} ${styles.half}`}>
            <div className={styles.inputIcon}>
              <i className="fas fa-user"></i>
            </div>
            <div className={styles.inputField}>
              <input type="text" required />
              <label>Last Name</label>
            </div>
          </div>

          <div className={`${styles.inputGroup} ${styles.half}`}>
            <div className={styles.inputIcon}>
              <i className="fas fa-at"></i>
            </div>
            <div className={styles.inputField}>
              <input type="text" required />
              <label>Username</label>
            </div>
          </div>
        </div>

        <div className={styles.formRow}>
          <div className={`${styles.inputGroup} ${styles.half}`}>
            <div className={styles.inputIcon}>
              <i className="fas fa-phone"></i>
            </div>
            <div className={styles.inputField}>
              <input type="tel" pattern="[0-9]{10}" required />
              <label>Phone Number</label>
            </div>
          </div>

          <div className={`${styles.inputGroup} ${styles.half}`}>
            <div className={styles.inputIcon}>
              <i className="fas fa-envelope"></i>
            </div>
            <div className={styles.inputField}>
              <input type="email" required />
              <label>Email</label>
            </div>
          </div>
        </div>

        {/* Password Fields */}
<div className={styles.inputGroup}>
  <div className={styles.inputIcon}>
    <i className="fas fa-lock"></i>
  </div>
  <div className={styles.inputField}>
    <input
      type={showPassword ? "text" : "password"}
      required
    />
    <label>Password</label>
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
      required
      
    />
    <label>Confirm Password</label>
    <span
      className={styles.passwordToggle}
      onClick={() => setShowConfirm(!showConfirm)}
    >
      <i className={`fas ${showConfirm ? "fa-eye-slash" : "fa-eye"}`}></i>
    </span>
  </div>
</div>


        {/* Terms and Submit */}
        <div className={styles.termsPrivacy}>
          <input type="checkbox" required id="terms" />
          <label htmlFor="terms">
            {
                /*
                THIS SHIT WILL BE REPLACED BY LINK WHEN MERON NA PAGE
                */
            }
            I agree to the <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>
          </label>
        </div>

        <button type="submit" className={`${styles.btn} ${styles.registerBtn}`}>
          <span className={styles.btnText}>Create Account</span>
          <span className={styles.btnIcon}>
            <i className="fas fa-user-plus"></i>
          </span>
        </button>

        <div className={styles.toggleLink}>
          <p>
            Already have an account?{" "}
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                onSwitch("login");
              }}
            >
              Log in here
            </a>
          </p>
        </div>
      </form>
    </div>
  );
}
