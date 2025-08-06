import React, { useState } from "react";
import styles from "./VerifyCodeForm.module.css";
import { Activity } from 'lucide-react';

export function VerifyCodeForm({ onSwitch }) {
  const [code, setCode] = useState(["", "", "", "", "", ""]);

  const handleChange = (index, e) => {
    const newCode = [...code];
    newCode[index] = e.target.value.slice(-1); // only 1 digit
    setCode(newCode);

    // Auto-focus next input
    const next = e.target.nextSibling;
    if (next && newCode[index]) next.focus();
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
        <p className={styles.tagline}>Enter Verification Code</p>
      </div>

      <div className={styles.infoCard}>
        <div className={styles.infoIcon}>
          <i className="fas fa-shield-alt"></i>
        </div>
        <div className={styles.infoContent}>
          <h3>Security Check</h3>
          <p>We've sent a 6-digit verification code to your email. Enter it below to continue resetting your password.</p>
        </div>
      </div>

      <form>
        <div className={styles.verificationInputs}>
          {code.map((digit, idx) => (
            <input
              key={idx}
              type="text"
              maxLength={1}
              value={digit}
              onChange={(e) => handleChange(idx, e)}
              className={styles.codeInput}
            />
          ))}
        </div>

        <button type="submit" className={styles.btn}>
          <span className={styles.btnText}>Verify Code</span>
          <span className={styles.btnIcon}>
            <i className="fas fa-check-circle"></i>
          </span>
        </button>

        <div className={styles.toggleLink}>
          <p>
            Didn’t get the code? <a href="#">Resend</a>
          </p>
          <p>
            <a href="#" onClick={() => onSwitch("forgot")}>
              Go back
            </a>
          </p>
        </div>
      </form>
    </div>
  );
}
