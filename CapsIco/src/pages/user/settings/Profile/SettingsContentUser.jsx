import React from 'react';
import styles from './SettingsContentUser.module.css';

export function SettingsContent() {
  return (
    <div className={styles.content}>
      <h2>Profile Settings</h2>
      <p>Manage your account information and preferences.</p>

      {/* Personal Information */}
      <section className={styles.section}>
        <h3>Personal Information</h3>
        <form>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="fullName">Full Name</label>
              <input type="text" id="fullName" defaultValue="Angelico" />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="email">Email Address</label>
              <input type="email" id="email" defaultValue="admin@primelab.com" />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="phone">Phone Number</label>
              <input type="tel" id="phone" defaultValue="+1 (555) 123-4567" />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="joinDate">Join Date</label>
              <input type="date" id="joinDate" defaultValue="2022-06-15" />
              {/* Make Value the creation of account date */}
            </div>
          </div>

          <div className={styles.formActions}>
            <button type="button" className={styles.btnSecondary}>Cancel</button>
            <button type="submit" className={styles.btnPrimary}>Save Changes</button>
            {/* Added Object Method for saving changes, get fields(Last Name, First Name, Middle Initial (optional),
             Email Address    !!!!!!!(will need to reverify)!!!!!!    , Phone Number) */}
          </div>
        </form>
      </section>

      {/* Preferences */}
      <section className={styles.section}>
        <h3>Preferences</h3>

        {[
          {
            label: "Email Notifications",
            desc: "Receive email notifications for important updates",
            checked: true
          },
          {
            label: "Two-Factor Authentication",
            desc: "Add an extra layer of security to your account",
            checked: false
          },
          
        ].map((pref, index) => (
          <div key={index} className={styles.switchContainer}>
            <div className={styles.switchLabel}>
              <h4>{pref.label}</h4>
              <p>{pref.desc}</p>
            </div>
            <label className={styles.switch}>
              <input type="checkbox" defaultChecked={pref.checked} />
              <span className={styles.slider}></span>
            </label>
          </div>
        ))}
      </section>
      
      {/* Password */}
      <section className={styles.section}>
        <h3>Password</h3>
        <form>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="currentPassword">Current Password</label>
              <input type="password" id="currentPassword" />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="newPassword">New Password</label>
              <input type="password" id="newPassword" />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword">Confirm New Password</label>
              <input type="password" id="confirmPassword" />
            </div>
          </div>

          <div className={styles.formActions}>
            <button type="button" className={styles.btnSecondary}>Cancel</button>
            <button type="submit" className={styles.btnPrimary}>Update Password</button>
            {/* Added Object Method for updating password, get fields(Current Password, New Password, Confirm New Password) */}
          </div>
        </form>
      </section>
    </div>
  );
}
