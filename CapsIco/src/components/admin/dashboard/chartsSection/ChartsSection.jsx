import React from 'react';
import styles from './ChartsSection.module.css';
import { ChartCard } from '../chartCard/ChartCard';

export function ChartsSection() {
  return (
    <div className={styles.chartContainer}>
      <ChartCard
        title="Appointment Statistics"
        placeholderText="Appointment Trend Chart"
        options={["Last 7 Days", "Last 30 Days", "Last 90 Days"]}
      />

      <ChartCard
        title="Most Used Services"
        placeholderText="Department Distribution Chart"
        options={["All Services", "Laboratory", "Radiology"]}
      />
    </div>
  );
}
