import React from 'react';
import styles from './ChartCard.module.css';

export function ChartCard({ title, options = [], placeholderText, selected, onChange, children, badge, controls }) {
  return (
    <div className={styles.chartCard}>
      <div className={styles.chartHeader}>
        <h3>{title}</h3>
        <div className={styles.chartControls}>
          {controls ? <div className={styles.controlsGroup}>{controls}</div> : null}
          {badge ? <span className={styles.headerBadge}>{badge}</span> : null}
          {options.length > 0 && (
            <select value={selected} onChange={(e) => onChange && onChange(e.target.value)}>
              {options.map((option, idx) => (
                <option key={idx} value={option}>{option}</option>
              ))}
            </select>
          )}
        </div>
      </div>
      {children ? (
        <div className={styles.chartBody}>{children}</div>
      ) : (
        <div className={styles.chartPlaceholder}>
          <p>{placeholderText}</p>
        </div>
      )}
    </div>
  );
}
