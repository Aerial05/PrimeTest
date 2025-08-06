import React from 'react';
import styles from './ReportChart.module.css';

export function ReportChart() {
  const bars = [
    { label: 'Jan', value: 4.7, height: '85%' },
    { label: 'Feb', value: 4.5, height: '75%' },
    { label: 'Mar', value: 4.6, height: '80%' },
    { label: 'Apr', value: 4.4, height: '70%' },
    { label: 'May', value: 4.5, height: '78%' },
    { label: 'Jun', value: 4.8, height: '90%' },
    { label: 'Jul', value: 4.9, height: '95%' },
  ];

  return (
    <div className={styles.reportChart}>
      <h3>
        Performance Metrics
        <div className={styles.chartControls}>
          <select id="chartMetric">
            <option value="attendance">Attendance</option>
            <option value="tasks">Tasks</option>
            <option value="rating" selected>Rating</option>
          </select>
          <select id="chartPeriod">
            <option value="week">Weekly</option>
            <option value="month" selected>Monthly</option>
            <option value="quarter">Quarterly</option>
          </select>
        </div>
      </h3>

      <div className={styles.chartPlaceholder}>
        <div className={styles.chartBars}>
          {Array.isArray(bars) && bars.map((bar, index) => (
            <div
              key={index}
              className={styles.chartBar}
              style={{ height: bar.height }}
              data-value={bar.value}
              data-label={bar.label}
            ></div>
          ))}
        </div>
      </div>
    </div>
  );
}
