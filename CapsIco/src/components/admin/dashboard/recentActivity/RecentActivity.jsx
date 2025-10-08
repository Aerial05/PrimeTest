import React, { useEffect, useMemo, useState } from 'react';
import styles from './RecentActivity.module.css';
import { get, ref, query, orderByChild, limitToLast, endAt } from 'firebase/database';
import { usersDB } from '/src/config/firebase-config';

const ICONS = {
  // appointments
  appointment: { icon: 'fas fa-calendar-check', color: '#3498db', bg: 'rgba(52, 152, 219, 0.15)' },
  upload_proof: { icon: 'fas fa-file-upload', color: '#2ecc71', bg: 'rgba(46, 204, 113, 0.15)' },
  // services
  service_package: { icon: 'fas fa-box-open', color: '#9b59b6', bg: 'rgba(155, 89, 182, 0.15)' },
  single_service: { icon: 'fas fa-stethoscope', color: '#e67e22', bg: 'rgba(230, 126, 34, 0.15)' },
  // reports
  report: { icon: 'fas fa-file-alt', color: '#16a085', bg: 'rgba(22, 160, 133, 0.15)' },
  // default
  general: { icon: 'fas fa-clipboard-list', color: '#95a5a6', bg: 'rgba(149, 165, 166, 0.15)' },
};

const ACTION_LABELS = {
  update_status: 'updated appointment status',
  delete: 'deleted',
  archive: 'archived',
  create: 'created',
  update: 'updated',
  upload_proof: 'uploaded proof for',
  print_report: 'printed report',
  download_report: 'downloaded report',
};

function relativeTime(iso) {
  if (!iso) return '';
  const ts = typeof iso === 'number' ? iso : Date.parse(iso);
  if (!Number.isFinite(ts)) return '';
  const diff = Date.now() - ts;
  const s = Math.round(diff / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  if (d < 7) return `${d}d ago`;
  const date = new Date(ts);
  return date.toLocaleString();
}

const PATH_CANDIDATES = [
  'adminActivityLogs',
  'activityLogs',
  'activities',
  'adminActivities',
  'logs/adminActivityLogs',
];

export function RecentActivity({ limit = 0, pageSize: pageSizeProp = 8, path: preferredPath }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sourcePath, setSourcePath] = useState('');
  const [cursorMs, setCursorMs] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const pageSize = Math.max(1, Number(limit || pageSizeProp) || 8);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const paths = preferredPath ? [preferredPath, ...PATH_CANDIDATES.filter(p => p !== preferredPath)] : PATH_CANDIDATES;
      let rows = [];
      let usedPath = '';
      for (const p of paths) {
        // Try optimized query first
        let snap = await get(query(ref(usersDB, p), orderByChild('createdAtMs'), limitToLast(pageSize))).catch(() => null);
        if (!snap || !snap.exists()) {
          // Fallback: raw read without query (handles missing createdAtMs or index)
          snap = await get(ref(usersDB, p)).catch(() => null);
        }
        if (snap && snap.exists()) {
          const val = snap.val();
          const list = Array.isArray(val)
            ? val.filter(Boolean)
            : Object.values(val || {});
          if (list && list.length) {
            rows = list;
            usedPath = p;
            break;
          }
        }
      }

      // Coerce shapes and sort by createdAtMs or createdAt
      const norm = (rows || []).map((r) => {
        const createdAtMs = typeof r.createdAtMs === 'number' ? r.createdAtMs : (r.createdAt ? Date.parse(r.createdAt) : undefined);
        return { ...r, createdAtMs };
      });
      norm.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
      setItems(norm);
      setSourcePath(usedPath);
      setCursorMs(norm.length ? norm[norm.length - 1].createdAtMs || null : null);
      setHasMore(norm.length >= pageSize);
    } catch (e) {
      console.warn('Failed to load activity logs', e);
      setItems([]);
      setSourcePath('');
      setCursorMs(null);
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const loadMore = async () => {
    if (!sourcePath || cursorMs == null) {
      await fetchLogs();
      return;
    }
    try {
      const q = query(
        ref(usersDB, sourcePath),
        orderByChild('createdAtMs'),
        endAt(cursorMs - 1),
        limitToLast(pageSize)
      );
      const snap = await get(q);
      if (!snap.exists()) {
        setHasMore(false);
        return;
      }
      const obj = snap.val() || {};
      const list = Array.isArray(obj) ? obj.filter(Boolean) : Object.values(obj);
      const norm = (list || []).map((r) => {
        const createdAtMs = typeof r.createdAtMs === 'number' ? r.createdAtMs : (r.createdAt ? Date.parse(r.createdAt) : undefined);
        return { ...r, createdAtMs };
      });
      norm.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
      // Deduplicate by id
      const seen = new Set((items || []).map((x) => x.id));
      const merged = [...items];
      for (const row of norm) {
        const key = row.id || `${row.type}:${row.action}:${row.createdAtMs}`;
        if (!seen.has(key)) {
          seen.add(key);
          merged.push(row);
        }
      }
      merged.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
      setItems(merged);
      const newCursor = merged.length ? merged[merged.length - 1].createdAtMs || null : null;
      setCursorMs(newCursor);
      setHasMore(norm.length >= pageSize);
    } catch (e) {
      console.warn('Failed to load more logs', e);
      setHasMore(false);
    }
  };

  const renderItem = (row, idx) => {
    const meta = ICONS[row.type] || ICONS.general;
    const action = ACTION_LABELS[row.action] || row.action || 'did an action on';
    const title = `${row.actor?.displayName || 'Admin'} ${action} ${row.targetName || row.targetId || ''}`.trim();
    const desc = row.description || '';
    return (
      <div key={row.id || idx} className={styles.activityItem}>
        <div className={styles.activityIcon} style={{ backgroundColor: meta.bg, color: meta.color }}>
          <i className={meta.icon}></i>
        </div>
        <div className={styles.activityDetails}>
          <h4>{title}</h4>
          {desc ? <p>{desc}</p> : null}
        </div>
        <div className={styles.activityTime}>{relativeTime(row.createdAtMs || row.createdAt)}</div>
      </div>
    );
  };

  return (
    <div className={styles.recentActivity}>
      <div className={styles.cardHeader}>
        <h2>Recent Activity</h2>
        <button className={styles.refreshBtn} onClick={fetchLogs} disabled={loading}>
          <i className={loading ? 'fas fa-spinner fa-spin' : 'fas fa-sync-alt'}></i> {loading ? 'Loading…' : 'Refresh'}
        </button>
      </div>

      <div className={styles.activityList}>
        {items.length === 0 && (
          <div className={styles.activityItem}>
            <div className={styles.activityDetails}>
              <p>No recent admin activity found{sourcePath ? ` at ${sourcePath}` : ''}.</p>
            </div>
          </div>
        )}
        {items.map(renderItem)}
        {items.length > 0 && hasMore && (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0' }}>
            <button className={styles.refreshBtn} onClick={loadMore}>
              Load more
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
