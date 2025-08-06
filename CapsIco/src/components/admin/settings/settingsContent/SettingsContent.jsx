import React from 'react';
import styles from './SettingsContent.module.css';

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
              <input type="text" id="fullName" defaultValue="Admin User" />
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
            <div className={styles.formGroup}>
              <label htmlFor="position">Position</label>
              <input type="text" id="position" defaultValue="System Administrator" />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="department">Department</label>
              <select id="department" defaultValue="IT">
                <option>IT</option>
                <option>Management</option>
                <option>Laboratory</option>
                <option>Radiology</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="joinDate">Join Date</label>
              <input type="date" id="joinDate" defaultValue="2022-06-15" />
            </div>
          </div>

          <div className={styles.formActions}>
            <button type="button" className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">Save Changes</button>
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
          {
            label: "Dark Mode",
            desc: "Switch between light and dark themes",
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

      {/* Theme Colors */}
      <section className={styles.section}>
        <h3>Theme Colors</h3>
        <div>
          {['#e83e8c', '#6610f2', '#007bff', '#28a745', '#fd7e14', '#20c997'].map((color, idx) => (
            <div
              key={idx}
              className={`${styles.colorOption} ${idx === 0 ? styles.active : ''}`}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
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
            <button type="button" className="btn btn-secondary">Cancel</button>
            <button type="submit" className="btn btn-primary">Update Password</button>
          </div>
        </form>
      </section>
    </div>
  );
}
