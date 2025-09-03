import React from 'react';
import styles from './StatsOverview.module.css';
import { StatCard } from '../statCard/StatCard';
import { FaCalendarCheck, FaFlask } from 'react-icons/fa';


export function StatsOverview() {
  const stats = [
    {
      icon: <FaCalendarCheck />,
      value: 128,
      label: 'Appointments Today',
      color: 'blue',
    },
    {
      icon: <FaFlask />,
      value: 85,
      label: 'Tests Completed',
      color: 'green',
    },
  ];

  return (
    <div className={styles.statsGrid}>
      {stats.map((stat, index) => (
        <StatCard
          key={index}
          icon={stat.icon}
          value={stat.value}
          label={stat.label}
          color={stat.color}
        />
      ))}
    </div>
  );
}
