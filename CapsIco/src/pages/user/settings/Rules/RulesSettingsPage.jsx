import React from 'react';
import styles from './RulesSettingsPage.module.css';

export function RulesSettingsPage() {
  return (
    <section className={styles.rulesSection}>
      <h2>Rules & Regulations</h2>

      {/* Priority order highlight */}
      <div className={styles.policyCard} role="note" aria-label="Service Priority Order">
        <h3 className={styles.policyTitle}>Service Priority Order</h3>
        <p className={styles.policyText}>
          If a walk‑in and a scheduled patient arrive at the same time, we serve patients in this order:
        </p>
        <ol style={{ paddingLeft: 18, margin: '6px 0 0' }}>
          <li><strong>Medical urgency</strong> — based on the patient’s current condition.</li>
          <li><strong>First in queue</strong> — the walk‑in who arrived earlier.</li>
          <li><strong>Scheduled time</strong> — patients with appointments at their booked time.</li>
        </ol>
      </div>

      <div className={styles.policyCard}>
        <h3 className={styles.policyTitle}>Important Appointment Policy</h3>
        <p className={styles.policyText}>
          Cancellation or rescheduling of appointments multiple times may result in a
          temporary restriction: a 3-day block from booking new appointments.
          Please only book when you are reasonably sure you can attend.
        </p>
      </div>

      <div className={styles.section}>
        <h3>Appointments</h3>
        <ul>
          <li>Arrive on time and bring a valid ID and any required documents.</li>
          <li>If you need to cancel or reschedule, do so as early as possible.</li>
          <li>Late arrivals may be requeued or asked to book a new slot.</li>
          <li>Preparation instructions (e.g., fasting) must be followed where applicable.</li>
        </ul>
      </div>

      <div className={styles.section}>
        <h3>Conduct</h3>
        <ul>
          <li>Treat staff and other patients with courtesy and respect.</li>
          <li>Harassment, abusive language, or disruptive behavior is not allowed.</li>
          <li>Follow posted signs and staff directions within the facility.</li>
        </ul>
      </div>

      <div className={styles.section}>
        <h3>Privacy & Data</h3>
        <ul>
          <li>Your personal and health information is handled in accordance with applicable privacy laws.</li>
          <li>Only provide accurate information and keep your contact details up to date.</li>
          <li>Do not share confidential information of others without consent.</li>
        </ul>
      </div>

      <div className={styles.section}>
        <h3>Payments & Billing</h3>
        <ul>
          <li>Settle any required fees or co-payments as advised.</li>
          <li>Some services may require advance payment or a deposit.</li>
          <li>Refunds (where applicable) follow clinic policy and processing timelines.</li>
        </ul>
      </div>

      <div className={styles.section}>
        <h3>Communication</h3>
        <ul>
          <li>Use the provided channels (email, phone, or in-app messages) for support and inquiries.</li>
          <li>Report suspicious activity, safety concerns, or system issues to the admin/support team.</li>
        </ul>
      </div>

      <p className={styles.note}>
        By using this service and booking an appointment, you acknowledge that you
        have read and agree to follow these policies. Violations may result in
        cancellation of appointments, temporary restrictions, or account action.
      </p>
    </section>
  );
}
