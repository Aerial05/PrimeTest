import React from 'react';
import styles from './StatCard.module.css';

export function StatCard({ icon, value, label, color, loading, error, delta, deltaTitle, metaLeft, metaRight }) {
  const showDelta = typeof delta === 'number' && !loading;
  const deltaClass = delta > 0 ? styles.deltaUp : delta < 0 ? styles.deltaDown : styles.deltaNeutral;
  return (
    <div className={styles.statCard} title={error || ''}>
      <div className={`${styles.statIcon} ${styles[color]}`}>
        {icon}
      </div>
      <div className={styles.statInfo}>
        <h3>
          {loading ? '—' : value}
          {showDelta ? (
            <span className={`${styles.deltaBadge} ${deltaClass}`} aria-label={delta > 0 ? 'Increased' : delta < 0 ? 'Decreased' : 'No change'} title={deltaTitle || ''}>
              {delta > 0 ? '▲' : delta < 0 ? '▼' : '–'}
            </span>
          ) : null}
        </h3>
        <p>{label}</p>
        {loading ? <div className={styles.skeleton} /> : null}
        {(metaLeft || metaRight) && !loading ? (
          <div className={styles.metaRow} aria-label="additional info">
            <span className={styles.metaLeft}>{metaLeft || ''}</span>
            <span className={styles.metaRight}>{metaRight || ''}</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}
