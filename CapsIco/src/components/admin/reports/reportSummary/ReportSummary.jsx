import React from 'react';
import styles from './ReportSummary.module.css';

export function ReportSummary() {
  const stats = [
    {
      value: 42,
      label: 'Total Staff',
      trend: 'up',
      percent: '5%',
      description: 'from last month',
    },
    {
      value: '95%',
      label: 'Attendance Rate',
      trend: 'up',
      percent: '2%',
      description: 'from last month',
    },
    {
      value: '87%',
      label: 'Task Completion',
      trend: 'down',
      percent: '3%',
      description: 'from last month',
    },
    {
      value: '4.8',
      label: 'Avg. Performance Rating',
      trend: 'up',
      percent: '0.2',
      description: 'from last month',
    },
  ];

  return (
    <div className={styles.reportSummary}>
      {Array.isArray(stats) && stats.length > 0 && stats.map((stat, idx) => (
        <div key={idx} className={styles.summaryCard}>
          <h3>{stat.value}</h3>
          <p>{stat.label}</p>
          <div className={`${styles.trend} ${styles[stat.trend]}`}>
            <i className={`fas fa-arrow-${stat.trend}`}></i> {stat.percent} {stat.description}
          </div>
        </div>
      ))}
    </div>
  );
}
