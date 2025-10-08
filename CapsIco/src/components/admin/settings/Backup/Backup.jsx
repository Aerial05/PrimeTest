import React, { useState } from 'react';
import styles from '@/pages/user/settings/Profile/SettingsContentUser.module.css';

export function Backup() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');

  const handleDownload = async () => {
    setBusy(true); setMsg('');
    try {
      // Build the REST URL for the Realtime Database root export with auth token if available
      const base = import.meta.env.VITE_FIREBASE_DATABASE_URL;
      if (!base) throw new Error('Missing VITE_FIREBASE_DATABASE_URL');
      // Attempt to include auth token for secured DBs
      let url = base.replace(/\/$/, '') + '/.json';
      let sep = url.includes('?') ? '&' : '?';
      try {
        const { getAuth } = await import('firebase/auth');
        const auth = getAuth();
        const user = auth.currentUser;
        if (user) {
          const token = await user.getIdToken();
          url = `${url}${sep}auth=${encodeURIComponent(token)}`;
          sep = '&';
        }
      } catch (_) {}

      // No-cache and download
      const res = await fetch(url, { cache: 'no-store' });
      if (!res.ok) throw new Error(`Export failed: ${res.status} ${res.statusText}`);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const stamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `capsico-backup-${stamp}.json`;
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 0);
      setMsg('Backup downloaded successfully.');
    } catch (e) {
      setMsg(e?.message || 'Failed to download backup');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className={styles.content}>
      <h2>Backup</h2>
      <p>Export and download a JSON snapshot of the Realtime Database.</p>

      <section className={styles.section}>
        <h3>Database Backup</h3>
        <div className={styles.formActions}>
          <button className={styles.btnPrimary} disabled={busy} onClick={handleDownload}>
            {busy ? 'Preparing…' : 'Download JSON Backup'}
          </button>
        </div>
        {msg && <p className={styles.muted} style={{ marginTop: 10 }}>{msg}</p>}
      </section>
    </div>
  );
}
