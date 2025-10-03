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
  const [activityOpen, setActivityOpen] = useState(false);
  // Logs are now shown on a dedicated page

  // Re-scan icons when modals/buttons change
  useEffect(() => {
    try { createIcons({ icons }); } catch {}
  }, [previewOpen, activityOpen]);


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
          <button
            type="button"
            className={styles.primaryBtn}
            onClick={() => setActivityOpen(true)}
            title="View recent activity"
            aria-label="View recent activity"
          >
            <i data-lucide="list" aria-hidden="true"></i>
            <span>Recent Activity</span>
          </button>
        </div>
        <StatsOverview />
        <ChartsSection />
  {/* RecentActivity moved into a large popup */}
      </main>
      {previewOpen && (
        <ReportPreviewModal html={previewHTML} onClose={() => setPreviewOpen(false)} />
      )}
      {activityOpen && (
        <div className={styles.modalOverlay} role="dialog" aria-modal="true" aria-label="Recent Activity">
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>Recent Activity</div>
              <button
                className={styles.closeBtn}
                onClick={() => setActivityOpen(false)}
                title="Close"
                aria-label="Close"
              >
                <i data-lucide="x" aria-hidden="true"></i>
              </button>
            </div>
            <div className={styles.modalBody}>
              <RecentActivity />
            </div>
          </div>
        </div>
      )}

    </>
  );
}
