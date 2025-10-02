import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { buildDashboardReportHTML } from '/src/utils/printDashboardReport';

import {StatsOverview} from '/src/components/admin/dashboard/StatsOverview/StatsOverview';
import {ChartsSection} from '/src/components/admin/dashboard/chartsSection/ChartsSection';
import {RecentActivity} from '/src/components/admin/dashboard/RecentActivity/RecentActivity';

import styles from './AdminDashboard.module.css'; // <-- CSS Module
import { createIcons, icons } from 'lucide';
import { ReportPreviewModal } from '/src/components/admin/dashboard/ReportPreviewModal/ReportPreviewModal';

export function AdminDashboard() {
  const navigate = useNavigate();
  useEffect(() => {
    createIcons({ icons });
  }, []);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHTML, setPreviewHTML] = useState('');


  return (
    <>
      <div className={styles.banner}>
        <div className={styles.container}>
          <p>Overview</p>
          <h1>Dashboard</h1>
        </div>
      </div>

      <main className={styles.container}>
        <div className={styles.actionsBar}>
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => {
              // Ask dashboard to capture the snapshot first
              const evt = new CustomEvent('admin-dashboard:prepare-report');
              window.dispatchEvent(evt);
              // Build HTML locally for preview without opening new tab
              setTimeout(() => {
                let raw = '';
                try { raw = sessionStorage.getItem('adminDashboardReportSnapshot') || ''; } catch(_) {}
                if (!raw) {
                  alert('No report data available yet. Open the dashboard and adjust filters first.');
                  return;
                }
                let snap; try { snap = JSON.parse(raw); } catch { snap = {}; }
                const html = buildDashboardReportHTML(snap);
                setPreviewHTML(html);
                setPreviewOpen(true);
              }, 50);
            }}
            title="Generate report"
            aria-label="Generate report"
          >
            <i data-lucide="file-text" aria-hidden="true"></i>
            <span>Generate Report</span>
          </button>
        </div>
        <StatsOverview />
        <ChartsSection />
        <RecentActivity />
      </main>
      {previewOpen && (
        <ReportPreviewModal html={previewHTML} onClose={() => setPreviewOpen(false)} />
      )}
    </>
  );
}
