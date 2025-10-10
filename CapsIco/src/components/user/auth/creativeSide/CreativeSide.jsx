import React from 'react';
import styles from './CreativeSide.module.css';
import { Activity, Calendar, Bell, FileText, UserCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

export function CreativeSide() {
  return (
    <div className={styles.creativeSide}>
      <div className={styles.gridOverlay} aria-hidden="true" />
      <div className={styles.brandSection}>
        <span className={styles.badge}>
          <span className={styles.badgeDot} /> JRAE
        </span>
        <div className={styles.logoLarge}>
          <Activity className={styles.logoIconLarge} />
          <h1>
            JRAE
          </h1>
        </div>
        <p className={styles.taglineLarge}>Your health, our priority</p>
        <div className={styles.ctaRow}>
          <Link to="/appointment" className={styles.ctaGhost}>
            Make an appointment <span className={styles.ctaIcon} aria-hidden>→</span>
          </Link>
        </div>
      </div>

      <div className={styles.featureHighlights}>
        <div className={styles.featureItem}>
          <div className={styles.featureIcon}>
            <Calendar size={22} color="#fff" strokeWidth={2} />
          </div>
          <div className={styles.featureText}>
            <h3>Easy Scheduling</h3>
            <p>Book appointments with just a few clicks, anytime, anywhere.</p>
          </div>
        </div>

        <div className={styles.featureItem}>
          <div className={styles.featureIcon}>
            <Bell size={22} color="#fff" strokeWidth={2} />
          </div>
          <div className={styles.featureText}>
            <h3>Smart Reminders</h3>
            <p>Never miss an appointment with our automated notification system.</p>
          </div>
        </div>

        <div className={styles.featureItem}>
          <div className={styles.featureIcon}>
            <FileText size={22} color="#fff" strokeWidth={2} />
          </div>
          <div className={styles.featureText}>
            <h3>Digital Records</h3>
            <p>Access your medical history and test results securely online.</p>
          </div>
        </div>

        <div className={styles.featureItem}>
          <div className={styles.featureIcon}>
            <UserCheck size={22} color="#fff" strokeWidth={2} />
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
