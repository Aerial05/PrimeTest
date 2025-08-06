import React from 'react';
import styles from './CreativeSide.module.css';
import { Activity } from 'lucide-react';

export function CreativeSide() {
  return (
    <div className={styles.creativeSide}>
      <div className={styles.brandSection}>
        <div className={styles.logoLarge}>
          <Activity className={styles.logoIconLarge} />
          <h1>
            PrimeLab <span>Appoint</span>
          </h1>
        </div>
        <p className={styles.taglineLarge}>Your health, our priority</p>
      </div>

      <div className={styles.featureHighlights}>
        <div className={styles.featureItem}>
          <div className={styles.featureIcon}>
            <i className="fas fa-calendar-check" />
          </div>
          <div className={styles.featureText}>
            <h3>Easy Scheduling</h3>
            <p>Book appointments with just a few clicks, anytime, anywhere.</p>
          </div>
        </div>

        <div className={styles.featureItem}>
          <div className={styles.featureIcon}>
            <i className="fas fa-bell" />
          </div>
          <div className={styles.featureText}>
            <h3>Smart Reminders</h3>
            <p>Never miss an appointment with our automated notification system.</p>
          </div>
        </div>

        <div className={styles.featureItem}>
          <div className={styles.featureIcon}>
            <i className="fas fa-file-medical" />
          </div>
          <div className={styles.featureText}>
            <h3>Digital Records</h3>
            <p>Access your medical history and test results securely online.</p>
          </div>
        </div>

        <div className={styles.featureItem}>
          <div className={styles.featureIcon}>
            <i className="fas fa-user-md" />
          </div>
          <div className={styles.featureText}>
            <h3>Expert Doctors</h3>
            <p>Connect with qualified healthcare professionals for consultations.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
