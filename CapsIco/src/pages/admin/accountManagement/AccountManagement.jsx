import React, { useEffect, useMemo, useState } from 'react';
import styles from './AccountManagement.module.css';
import { AdminTable } from '/src/components/admin/adminTable/AdminTable';
import { AddAdminForm } from '/src/components/admin/adminForm/AddAdminForm';
import { usersDB } from '@/config/firebase-config';
import { ref, onValue, update as dbUpdate, remove as dbRemove, set as dbSet, get as dbGet } from 'firebase/database';

export function AccountManagement() {
  const [showAdd, setShowAdd] = useState(false);
  const [mode, setMode] = useState('add');
  const [selected, setSelected] = useState(null);
  const [rows, setRows] = useState([]);

  // Utility: normalize various date formats (ISO string, ms, seconds) to ISO string
  const normalizeDate = (v) => {
    if (v == null || v === '') return '';
    try {
      let d;
      if (typeof v === 'number') {
        const ms = v < 1e12 ? v * 1000 : v; // seconds -> ms if needed
        d = new Date(ms);
      } else if (typeof v === 'string') {
        const trimmed = v.trim();
        if (/^\d+$/.test(trimmed)) {
          const num = parseInt(trimmed, 10);
          const ms = num < 1e12 ? num * 1000 : num;
          d = new Date(ms);
        } else {
          d = new Date(trimmed);
        }
      } else {
        d = new Date(v);
      }
      if (Number.isNaN(d.getTime())) return String(v);
      return d.toISOString();
    } catch {
      return String(v);
    }
  };

  // Subscribe to Realtime DB users and map to table rows
  useEffect(() => {
    const usersRef = ref(usersDB, 'users');
    const off = onValue(usersRef, (snap) => {
      const val = snap.val() || {};
      const next = Object.entries(val).map(([uid, u]) => ({
        id: uid,
        firstName: u.firstName || '',
        middleName: u.middleName || '',
        lastName: u.lastName || '',
        role: u.role || 'User',
        email: u.email || '',
        phone: u.phone || '',
        joinDate: normalizeDate(u.joinDate || u.joinedDate || u.createdAt || u.created_at || u.createdOn || ''),
        lastActive: normalizeDate(u.lastActive || u.last_active || u.lastSeen || u.last_seen || u.updatedAt || u.updated_at || u.lastLogin || u.last_login || ''),
        status: u.status || 'Active',
      }));
      // Optional: sort by lastActive desc
      next.sort((a, b) => String(b.lastActive).localeCompare(String(a.lastActive)));
      setRows(next);
    });
    return () => off();
  }, []);

  return (
    <>
      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Accounts</h2>
            <button
              className={`${styles.btn} ${styles.btnPrimary}`}
              onClick={() => { setSelected(null); setMode('add'); setShowAdd(true); }}
            >
              Add Account
            </button>
          </div>
          <AdminTable
            rows={rows}
            onEdit={(row) => { setSelected(row); setMode('edit'); setShowAdd(true); }}
            onDelete={async (row) => {
              const confirmed = window.confirm(`Remove user "${row.lastName}, ${row.firstName}" from active list? This will archive the record.`);
              if (!confirmed) return;
              try {
                const nowIso = new Date().toISOString();
                // Archive under usersArchive/{uid}
                const archivePayload = {
                  ...row,
                  archivedAt: nowIso,
                };
                await dbSet(ref(usersDB, `usersArchive/${row.id}`), archivePayload);
                // Remove from active list (does not delete Auth user)
                await dbRemove(ref(usersDB, `users/${row.id}`));
              } catch (e) {
                console.error('Failed to archive/remove user', e);
                alert('Failed to archive user. Please try again.');
              }
            }}
            onSelect={(row) => {
              setSelected(row);
              setMode('edit');
              setShowAdd(true);
            }}
          />
        </div>
        {showAdd && (
          <AddAdminForm
            mode={mode}
            initialData={selected}
            onClose={() => setShowAdd(false)}
            onSubmit={async (data) => {
              // Persist account fields to Realtime DB; table auto-updates via onValue
              const uid = String(data.id || '').trim();
              if (!uid) {
                alert('Cannot save without a user ID (uid). Editing existing users is supported. Creating new Auth users requires server-side Admin SDK.');
                return;
              }
              // Convert datetime-local to ISO; if empty, preserve from DB
              const localToISO = (v) => {
                if (!v) return '';
                const d = new Date(v);
                if (Number.isNaN(d.getTime())) return '';
                return d.toISOString();
              };

              let joinDate = localToISO(data.joinDate);
              if (!joinDate) {
                try {
                  const snap = await dbGet(ref(usersDB, `users/${uid}/joinDate`));
                  const existing = snap.exists() ? snap.val() : '';
                  joinDate = normalizeDate(existing);
                } catch {
                  // ignore
                }
              }
              const nowIso = new Date().toISOString();
              const payload = {
                firstName: data.firstName || '',
                middleName: data.middleName || '',
                lastName: data.lastName || '',
                email: data.email || '',
                phone: data.phone || '',
                role: data.role || 'User',
                status: data.status || 'Active',
                joinDate,
                lastActive: nowIso,
                updatedAt: nowIso,
              };
              try {
                await dbUpdate(ref(usersDB, `users/${uid}`), payload);
                setShowAdd(false);
              } catch (e) {
                console.error('Failed to save user to DB', e);
                alert('Failed to save changes. Please try again.');
              }
            }}
          />
        )}
      </main>
    </>
  );
}
