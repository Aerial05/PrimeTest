import React, { useEffect } from 'react';

import {StatsOverview} from '/src/components/admin/dashboard/StatsOverview/StatsOverview';
import {ChartsSection} from '/src/components/admin/dashboard/chartsSection/ChartsSection';
import {RecentActivity} from '/src/components/admin/dashboard/RecentActivity/RecentActivity';

import styles from './AdminDashboard.module.css'; // <-- CSS Module
import { createIcons, icons } from 'lucide';

export function AdminDashboard() {
  useEffect(() => {
    createIcons({ icons });
  }, []);

  return (
    <>
      <div className={styles.banner}>
        <div className={styles.container}>
          <p>Overview</p>
          <h1>Dashboard</h1>
        </div>
      </div>

      <main className={styles.container}>
        <StatsOverview />
        <ChartsSection />
        <RecentActivity />
      </main>
    </>
  );
}
