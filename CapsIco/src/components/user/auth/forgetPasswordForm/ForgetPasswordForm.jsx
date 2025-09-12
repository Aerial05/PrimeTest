import React, { useState } from "react";
import styles from "./ForgetPasswordForm.module.css";
import { Activity } from "lucide-react";
import { sendPasswordResetEmail, fetchSignInMethodsForEmail } from "firebase/auth";
import { get, ref } from "firebase/database";
import { auth, usersDB } from "../../../../config/firebase-config";

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

      const id = identifier.trim();
      if (!id) throw new Error("Please enter your email or username.");

      // Resolve to an email
      let emailToUse = "";
      const isEmail = id.includes("@");

      if (isEmail) {
        emailToUse = id;
      } else {
        // Try common username->email mappings in Realtime DB
        const paths = [
          `usernames/${id}`,
          `usersByUsername/${id}/email`,
          `users/${id}/email`,
        ];
        for (const p of paths) {
          // eslint-disable-next-line no-await-in-loop
          const snap = await get(ref(usersDB, p));
          if (snap.exists()) {
            const val = snap.val();
            emailToUse = typeof val === "string" ? val : (val?.email || "");
            if (emailToUse) break;
          }
        }
        if (!emailToUse) throw new Error("Username not found.");
      }

      // Check if an account exists for this email
      const methods = await fetchSignInMethodsForEmail(auth, emailToUse);
      if (!methods || methods.length === 0) {
        throw new Error("No account found for that email.");
      }

      await sendPasswordResetEmail(auth, emailToUse);
      setMessage("Password reset email sent. Check your inbox.");
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

      <form onSubmit={handleSubmit}>
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
