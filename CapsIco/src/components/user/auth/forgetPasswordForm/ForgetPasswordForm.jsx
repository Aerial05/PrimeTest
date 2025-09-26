import React, { useState } from "react";
import styles from "./ForgetPasswordForm.module.css";
import { Activity } from "lucide-react";
import authService from "../../../../services/AuthService";

export function ForgetPasswordForm({ onSwitch }) {
  const [identifier, setIdentifier] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setMessage("");
    try {
      setLoading(true);
      const responseMessage = await authService.sendPasswordReset(identifier);
      setMessage(responseMessage);
    } catch (err) {
      setError(err.message || "Failed to send reset email");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.formBox}>
      <div className={styles.formHeader}>
        <div className={styles.logo}>
          <Activity className={styles.logoIconLarge} />
          <h1>
            PrimeLab <span className="brand-gradient-text">Appoint</span>
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
            We'll send a verification code to your email to help you reset your
            password securely.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        <div className={styles.formIconHeader}>
          <div className={styles.formIconCircle}>
            <i className="fas fa-key"></i>
          </div>
          <h3>Forgot Password?</h3>
          <p>
            Enter your email address and we'll send you a verification code.
          </p>
        </div>

        <div className={styles.inputGroup}>
          <div className={styles.inputIcon}>
            <i className="fas fa-envelope"></i>
          </div>
          <div className={styles.inputField}>
            <input type="text" value={identifier} onChange={(e)=>setIdentifier(e.target.value)} required />
            <label>Email or Username</label>
          </div>
        </div>

        {message && <p className={styles.successText}>{message}</p>}
        {error && <p className={styles.errorText}>{error}</p>}

        <button type="submit" disabled={loading} className={`${styles.btn} ${styles.forgotBtn}`}>
          <span className={styles.btnText}>{loading ? "Sending..." : "Send Verification Code"}</span>
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
