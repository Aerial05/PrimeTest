import React from 'react';
import styles from './StatCard.module.css';

export function StatCard({ icon, value, label, color }) {
  return (
    <div className={styles.statCard}>
      <div className={`${styles.statIcon} ${styles[color]}`}>
        {icon}
      </div>
      <div className={styles.statInfo}>
        <h3>{value}</h3>
        <p>{label}</p>
      </div>
    </div>
  );
}
