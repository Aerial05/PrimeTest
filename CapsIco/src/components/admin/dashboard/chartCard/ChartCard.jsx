import React from 'react';
import styles from './ChartCard.module.css';

export function ChartCard({ title, options, placeholderText }) {
  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <h3>{title}</h3>
        <div className={styles.chartControls}>
          <select>
            {options.map((option, idx) => (
              <option key={idx}>{option}</option>
            ))}
          </select>
        </div>
      </div>
      <div className={styles.chartPlaceholder}>
        <p>{placeholderText}</p>
      </div>
    </div>
  );
}
