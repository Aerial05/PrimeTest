import React from 'react';
import styles from './ReportTabs.module.css';

export function ReportTabs({ tabs, activeTab, setActiveTab }) {
  return (
    <div className={styles.reportTabs}>
      {tabs.map((tab) => (
        <div
          key={tab.id}
          className={`${styles.reportTab} ${activeTab === tab.id ? styles.active : ''}`}
          onClick={() => setActiveTab(tab.id)}
        >
          {tab.label}
        </div>
      ))}
    </div>
  );
}
