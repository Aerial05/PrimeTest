import React, { useState } from "react";
import styles from "./RegisterForm.module.css";
import { Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import authService from "../../../../services/AuthService";
import { formatPHDisplay, toE164PH, isValidE164PH } from "/src/utils/phone";

export function RegisterForm({ onSwitch }) {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [username, setUsername] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    try {
      setLoading(true);
      const phoneE164 = toE164PH(phone);
      if (!isValidE164PH(phoneE164)) {
        setError("Enter a valid PH number (+63 9xx xxx xxxx)");
        return;
      }
      await authService.registerUser({
        firstName,
        middleName,
        lastName,
        username,
        phoneE164,
        email,
        password,
      });
      navigate("/");
    } catch (err) {
      setError(err.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  // Philippines format: +63 9XX XXX XXXX (store as E.164 +639XXXXXXXXX)
  const formatPhone = (value) => formatPHDisplay(value);

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

      <form onSubmit={handleSubmit}>
        {/* Name Row */}
        <div className={styles.formRow}>
          <div className={`${styles.inputGroup} ${styles.half}`}>
            <div className={styles.inputIcon}>
              <i className="fas fa-user"></i>
            </div>
            <div className={styles.inputField}>
              <input type="text" value={firstName} onChange={(e)=>setFirstName(e.target.value)} required />
              <label>First Name</label>
            </div>
          </div>

          <div className={`${styles.inputGroup} ${styles.half}`}>
            <div className={styles.inputIcon}>
              <i className="fas fa-user"></i>
            </div>
            <div className={styles.inputField}>
              <input type="text" value={middleName} onChange={(e)=>setMiddleName(e.target.value)} />
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
              <input type="text" value={lastName} onChange={(e)=>setLastName(e.target.value)} required />
              <label>Last Name</label>
            </div>
          </div>

          <div className={`${styles.inputGroup} ${styles.half}`}>
            <div className={styles.inputIcon}>
              <i className="fas fa-at"></i>
            </div>
            <div className={styles.inputField}>
              <input type="text" value={username} onChange={(e)=>setUsername(e.target.value)} />
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
              <input
                type="tel"
                inputMode="numeric"
                maxLength={16}
                value={phone}
                onChange={(e)=> setPhone(formatPhone(e.target.value))}
                placeholder="+63 912 345 6789"
                required
              />
              <label>Phone Number</label>
            </div>
          </div>

          <div className={`${styles.inputGroup} ${styles.half}`}>
            <div className={styles.inputIcon}>
              <i className="fas fa-envelope"></i>
            </div>
            <div className={styles.inputField}>
              <input type="email" value={email} onChange={(e)=>setEmail(e.target.value)} required />
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
      value={password}
      onChange={(e)=>setPassword(e.target.value)}
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
      value={confirmPassword}
      onChange={(e)=>setConfirmPassword(e.target.value)}
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

        {error && <p className={styles.errorText}>{error}</p>}

        <button type="submit" disabled={loading} className={`${styles.btn} ${styles.registerBtn}`}>
          <span className={styles.btnText}>{loading ? "Creating..." : "Create Account"}</span>
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
