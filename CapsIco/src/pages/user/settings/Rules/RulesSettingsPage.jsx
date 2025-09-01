import React from 'react';
import styles from './Rules.SettingsPageConent.css';
export function RulesAndRegulations() {
  return (
    <section className={styles.rulesSection}>
      <h2>Rules & Regulations</h2>
      <ul>
        <li>Respect all users and staff members.</li>
        <li>Do not share personal information.</li>
        <li>No spamming or advertising.</li>
        <li>Follow all posted guidelines and instructions.</li>
        <li>Report any suspicious activity to the admin.</li>
        <li>Use appropriate language at all times.</li>
      </ul>
      <p className={styles.note}>
        Violation of these rules may result in suspension or termination of your account.
      </p>
    </section>
  );
}