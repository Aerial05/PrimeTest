import React, { useState, useEffect } from 'react';

import { ReportFilters } from '/src/components/admin/reports/ReportFilters/ReportFilters';
import { ReportSummary } from '/src/components/admin/reports/ReportSummary/ReportSummary';
import { ReportChart } from '/src/components/admin/reports/ReportChart/ReportChart';
import { ReportTable } from '/src/components/admin/reports/ReportTable/ReportTable';
import { ReportPagination } from '/src/components/admin/reports/pagination/ReportPagination';

import styles from './ReportsPage.module.css'; // ✅ Import properly
import { createIcons, icons } from 'lucide';

export function ReportsPage() {
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    createIcons({ icons });
  }, []);

  return (
    <>
      <div className={styles.banner}>
        <div className={styles.container}>
          <p>Analytics</p>
          <h1>Reports</h1>
        </div>
      </div>

      <main className={styles.container}>
        <ReportFilters />

        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Staff Performance Report</h2>
            <div>
              <button className="btn btn-sm btn-secondary">
                <i className="fas fa-print"></i> Print
              </button>
              <button className="btn btn-sm btn-primary">
                <i className="fas fa-download"></i> Export
              </button>
            </div>
          </div>

          <div className={styles.cardBody}>
            <ReportSummary />
            <ReportChart />
            <ReportTable />
            <ReportPagination
              currentPage={currentPage}
              totalPages={3}
              onPageChange={setCurrentPage}
            />
          </div>
        </div>
      </main>
    </>
  );
}
