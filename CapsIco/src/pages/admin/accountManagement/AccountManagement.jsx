import React, { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './AccountManagement.module.css';
import { AdminTable } from '/src/components/admin/adminTable/AdminTable';
import { AddAdminForm } from '/src/components/admin/adminForm/AddAdminForm';
import { usersDB } from '@/config/firebase-config';
import { ref, onValue, update as dbUpdate, remove as dbRemove, set as dbSet, get as dbGet } from 'firebase/database';
import { useToast } from '@/components/shared/toast/ToastProvider.jsx';
import authService from '@/services/AuthService';
import activityLogService from '/src/services/ActivityLogService';
import appointmentsService from '/src/services/AppointmentsService';

export function AccountManagement() {
  const { show } = useToast();
  const [showAdd, setShowAdd] = useState(false);
  const [mode, setMode] = useState('add');
  const [selected, setSelected] = useState(null);
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [policyInfo, setPolicyInfo] = useState({ cancelCountCycle: 0, cooldownUntil: '', overrideRequests: [] });
  const [policyLoading, setPolicyLoading] = useState(false);
  const [policyError, setPolicyError] = useState('');
  const [resetBusy, setResetBusy] = useState(false);

  // Filters (persist per admin)
  const uid = authService.currentUser?.uid || 'anon';
  const storageKey = `accountMgmt:filters:${uid}`;
  const [roleFilter, setRoleFilter] = useState('All'); // All | Admin | User
  const [statusFilter, setStatusFilter] = useState('All'); // All | Active | Inactive
  const [providerFilter, setProviderFilter] = useState('All'); // All | provider
  const [search, setSearch] = useState(''); // name/email/username
  const [joinedFrom, setJoinedFrom] = useState('');
  const [joinedTo, setJoinedTo] = useState('');

  // Close modals on ESC
  useEffect(() => {
    if (!showAdd && !deleteTarget) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (showAdd) setShowAdd(false);
        if (deleteTarget) setDeleteTarget(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [showAdd, deleteTarget]);

  // When opening Add/Edit modal with a selected user, load their appointment policy info
  useEffect(() => {
    const uid = selected?.id;
    if (!showAdd || !uid) { setPolicyInfo({ cancelCountCycle: 0, cooldownUntil: '', overrideRequests: [] }); setPolicyError(''); return; }
    setPolicyLoading(true);
    setPolicyError('');
    const policyRef = ref(usersDB, `users/${uid}/APPOINTMENT_POLICY`);
    const off = onValue(policyRef, (snap) => {
      const v = snap.val() || {};
      const cc = Number(v.cancelCountCycle || 0) || 0;
      const cd = typeof v.cooldownUntil === 'string' ? v.cooldownUntil : '';
      const list = v.overrideRequests ? Object.values(v.overrideRequests) : [];
      setPolicyInfo({ cancelCountCycle: cc, cooldownUntil: cd, overrideRequests: Array.isArray(list) ? list : Object.values(list || {}) });
      setPolicyLoading(false);
    }, (err) => {
      setPolicyError('Failed to load appointment policy');
      setPolicyLoading(false);
    });
    return () => off();
  }, [showAdd, selected?.id]);

  const resetUserChances = async (uid) => {
    if (!uid) return;
    setResetBusy(true);
    try {
      const now = new Date().toISOString();
      const updates = {
        cancelCountCycle: 0,
        cooldownUntil: '',
        updatedAt: now,
      };
      await dbUpdate(ref(usersDB, `users/${uid}/APPOINTMENT_POLICY`), updates);
      // Optionally remove override requests under the user node
      try { await dbRemove(ref(usersDB, `users/${uid}/APPOINTMENT_POLICY/overrideRequests`)); } catch (_) {}
      try {
        await activityLogService.log({
          type: 'policy',
          action: 'reset',
          description: `Reset appointment chances for user ${uid}`,
          targetId: uid,
          targetName: `${selected?.lastName || ''}, ${selected?.firstName || ''}`.trim(),
        });
      } catch (_) {}
      show({ type: 'success', title: 'Chances reset', message: 'User chances were reset. They can book again.' });
    } catch (e) {
      console.error('Failed to reset chances', e);
      show({ type: 'error', title: 'Reset failed', message: 'Could not reset chances. Please try again.' });
    } finally {
      setResetBusy(false);
    }
  };

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

  const normalizeRole = (r) => {
    const s = (r || '').toString().trim();
    return /^admin$/i.test(s) ? 'Admin' : 'User';
  };

  // Subscribe to Realtime DB users and map to table rows
  useEffect(() => {
    const usersRef = ref(usersDB, 'users');
    const off = onValue(usersRef, (snap) => {
      const val = snap.val() || {};
      const next = Object.entries(val).map(([uid, u]) => {
        const email = u.email || '';
        const username =
          u.username ||
          u.userName ||
          u.uname ||
          (u.profile && (u.profile.username || u.profile.userName)) ||
          (u.account && (u.account.username || u.account.userName)) ||
          (email ? String(email).split('@')[0] : '') ||
          '';
        const createdRaw = u.createdAt || u.created_at || u.createdOn || '';
        const lastLoginRaw = u.lastLoginAt || u.last_login_at || u.lastLogin || '';
        return {
          id: uid,
          firstName: u.firstName || '',
          middleName: u.middleName || '',
          lastName: u.lastName || '',
          username,
          role: normalizeRole(u.role || 'User'),
          email,
          phone: u.phone || '',
          authProvider: u.authProvider || u.provider || u.providerId || '',
          createdAt: normalizeDate(createdRaw),
          lastLoginAt: normalizeDate(lastLoginRaw),
          status: u.status || 'Active',
        };
      });
      // Optional: sort by lastLoginAt desc
      next.sort((a, b) => String(b.lastLoginAt).localeCompare(String(a.lastLoginAt)));
      setRows(next);
    });
    return () => off();
  }, []);

  // Load filters on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;
      const saved = JSON.parse(raw);
      if (!saved) return;
      if (saved.roleFilter) setRoleFilter(saved.roleFilter);
      if (saved.statusFilter) setStatusFilter(saved.statusFilter);
      if (saved.providerFilter) setProviderFilter(saved.providerFilter);
      if (typeof saved.search === 'string') setSearch(saved.search);
      if (typeof saved.joinedFrom === 'string') setJoinedFrom(saved.joinedFrom);
      if (typeof saved.joinedTo === 'string') setJoinedTo(saved.joinedTo);
      if (typeof saved.pageSize === 'number' && saved.pageSize > 0) {
        const allowed = new Set([6,10]);
        setPageSize(allowed.has(saved.pageSize) ? saved.pageSize : 6);
      }
    } catch (_) { /* ignore */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Persist filters
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify({ roleFilter, statusFilter, providerFilter, search, joinedFrom, joinedTo, pageSize }));
    } catch (_) { /* ignore */ }
  }, [storageKey, roleFilter, statusFilter, providerFilter, search, joinedFrom, joinedTo, pageSize]);

  // Providers list from rows
  const providerOptions = useMemo(() => {
    const set = new Set();
    rows.forEach(r => { const p = (r.authProvider || '').trim(); if (p) set.add(p); });
    const arr = Array.from(set).sort();
    return ['All', ...arr];
  }, [rows]);

  // Apply filters
  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    const from = joinedFrom ? new Date(joinedFrom) : null;
    const to = joinedTo ? new Date(joinedTo) : null;
    return rows.filter(r => {
      if (roleFilter !== 'All' && r.role !== roleFilter) return false;
      if (statusFilter !== 'All' && (r.status || 'Active') !== statusFilter) return false;
      if (providerFilter !== 'All' && (r.authProvider || '') !== providerFilter) return false;
      if (term) {
        const hay = `${r.firstName} ${r.middleName} ${r.lastName} ${r.username} ${r.email} ${r.phone}`.toLowerCase();
        if (!hay.includes(term)) return false;
      }
      if (from || to) {
        try {
          const d = r.createdAt ? new Date(r.createdAt) : null;
          if (from && (!d || d < from)) return false;
          if (to) {
            const end = new Date(to); end.setHours(23,59,59,999);
            if (!d || d > end) return false;
          }
        } catch (_) { /* ignore date filter if invalid */ }
      }
      return true;
    });
  }, [rows, roleFilter, statusFilter, providerFilter, search, joinedFrom, joinedTo]);

  // Clamp page when filtered length changes
  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(filteredRows.length / pageSize));
    if (page > maxPage) setPage(maxPage);
  }, [filteredRows, page, pageSize]);

  // Prevent body scroll while any modal is open
  useEffect(() => {
    if (showAdd || deleteTarget) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      document.body.classList.add('modal-open');
      return () => { document.body.style.overflow = prev; document.body.classList.remove('modal-open'); };
    }
  }, [showAdd, deleteTarget]);

  // Derive paginated slice and range text
  const total = filteredRows.length;
  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  const currentPage = Math.min(page, maxPage);
  const startIndex = (currentPage - 1) * pageSize;
  const pageRows = filteredRows.slice(startIndex, startIndex + pageSize);
  const from = total === 0 ? 0 : startIndex + 1;
  const to = Math.min(total, startIndex + pageSize);

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
          {/* Filter Bar */}
          <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', padding: '8px 0' }}>
            {/* Role Tabs */}
            <div style={{ display: 'flex', gap: 6 }}>
              {['All','Admin','User'].map(r => (
                <button
                  key={r}
                  className={styles.btn}
                  style={{ background: roleFilter===r? '#111827':'#f8fafc', color: roleFilter===r? '#fff':'#0f172a', border: '1px solid #cbd5e1', padding: '6px 10px', borderRadius: 8 }}
                  onClick={() => { setRoleFilter(r); setPage(1); }}
                >{r}</button>
              ))}
            </div>
            <div style={{ flex: 1 }} />
            {/* Status */}
            <label style={{ fontSize: 12, color: '#475569' }}>Status</label>
            <select value={statusFilter} onChange={e=>{ setStatusFilter(e.target.value); setPage(1); }} style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 10px' }}>
              {['All','Active','Inactive'].map(s => (<option key={s} value={s}>{s}</option>))}
            </select>
            {/* Provider */}
            <label style={{ fontSize: 12, color: '#475569' }}>Provider</label>
            <select value={providerFilter} onChange={e=>{ setProviderFilter(e.target.value); setPage(1); }} style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 10px' }}>
              {providerOptions.map(p => (<option key={p} value={p}>{p}</option>))}
            </select>
            {/* Joined Range */}
            <label style={{ fontSize: 12, color: '#475569' }}>Joined</label>
            <input type="date" value={joinedFrom} onChange={e=>{ setJoinedFrom(e.target.value); setPage(1); }} style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 10px' }} />
            <span style={{ color: '#64748b' }}>–</span>
            <input type="date" value={joinedTo} onChange={e=>{ setJoinedTo(e.target.value); setPage(1); }} style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 10px' }} />
            {/* Search */}
            <input
              type="search"
              value={search}
              onChange={e=>{ setSearch(e.target.value); setPage(1); }}
              placeholder="Search name, email, username, phone"
              style={{ minWidth: 260, border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 10px' }}
            />
            <button className={styles.btn} onClick={()=>{ setRoleFilter('All'); setStatusFilter('All'); setProviderFilter('All'); setJoinedFrom(''); setJoinedTo(''); setSearch(''); setPage(1); }}>
              Reset Filters
            </button>
          </div>
          <AdminTable
            rows={pageRows}
            onEdit={(row) => { setSelected(row); setMode('edit'); setShowAdd(true); }}
            onDelete={(row) => { setDeleteTarget(row); }}
            onSelect={(row) => {
              setSelected(row);
              setMode('edit');
              setShowAdd(true);
            }}
            pageSize={pageSize}
          />

          {/* Pagination footer */}
          <div className={styles.paginationBar}>
            <div className={styles.pageInfo}>
              {`Showing ${from.toLocaleString()}–${to.toLocaleString()} of ${total.toLocaleString()} accounts`}
            </div>
            <div className={styles.pageControls}>
              <label htmlFor="pageSizeSelect" className={styles.pageInfo} style={{ marginRight: 6 }}>Rows</label>
              <select
                id="pageSizeSelect"
                value={pageSize}
                onChange={(e)=> { const v = Math.max(1, parseInt(e.target.value,10)||8); setPageSize(v); setPage(1); }}
                style={{ border: '1px solid #cbd5e1', borderRadius: 8, padding: '6px 10px', marginRight: 8 }}
                aria-label="Rows per page"
              >
                {[6,10].map(n => (<option key={n} value={n}>{n}</option>))}
              </select>
              <button
                className={styles.pageBtn}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={currentPage <= 1}
                aria-label="Previous page"
              >
                Prev
              </button>
              <button
                className={`${styles.pageBtn} ${styles.pageBtnPrimary}`}
                onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
                disabled={currentPage >= maxPage}
                aria-label="Next page"
              >
                Next
              </button>
            </div>
          </div>
        </div>
        {showAdd && createPortal(
          <div
            className={styles.modalOverlay}
            role="dialog"
            aria-modal="true"
            aria-label={mode === 'edit' ? 'Edit Account' : 'Add Account'}
            onClick={() => setShowAdd(false)}
          >
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalContent}>
                <div className={styles.modalHeader}>
                  <h2>
                    <span className={styles.modalHeaderIcon}>
                      <i className={mode === 'edit' ? 'fas fa-user-edit' : 'fas fa-user-plus'}></i>
                    </span>
                    {mode === 'edit' ? 'Edit Account' : 'Add Account'}
                  </h2>
                  <button className={styles.btnClose} onClick={() => setShowAdd(false)} aria-label="Close">
                    <i className="fas fa-times"></i>
                  </button>
                </div>
                <AddAdminForm
                  mode={mode}
                  initialData={selected}
                  onClose={() => setShowAdd(false)}
                  onSubmit={async (data) => {
              // Persist account fields to Realtime DB; table auto-updates via onValue
              const uid = String(data.id || '').trim();
              if (!uid) {
                show({ type: 'error', title: 'Save failed', message: 'Missing user ID (uid). Editing existing users is supported. Creating new Auth users requires server-side Admin SDK.' });
                return;
              }
              // Convert datetime-local to ISO; if empty, preserve from DB
              const localToISO = (v) => {
                if (!v) return '';
                const d = new Date(v);
                if (Number.isNaN(d.getTime())) return '';
                return d.toISOString();
              };

              const existingSnap = await dbGet(ref(usersDB, `users/${uid}`));
              const existing = existingSnap.exists() ? existingSnap.val() : {};
              // Preserve createdAt if present; otherwise, set now
              const createdAt = existing.createdAt ? normalizeDate(existing.createdAt) : new Date().toISOString();
              const nowIso = new Date().toISOString();
              const payload = {
                firstName: data.firstName || '',
                middleName: data.middleName || '',
                lastName: data.lastName || '',
                username: data.username || '',
                email: data.email || '',
                phone: data.phone || '',
                role: normalizeRole(data.role || 'User'),
                status: data.status || 'Active',
                createdAt,
                lastLoginAt: existing.lastLoginAt || '',
              };
              try {
                await dbUpdate(ref(usersDB, `users/${uid}`), payload);
                try { await activityLogService.log({ type: 'account', action: mode==='add' ? 'create' : 'update', description: `${mode==='add' ? 'Added' : 'Updated'} account ${payload.email || payload.username || uid}`, targetId: uid, targetName: `${payload.lastName || ''}, ${payload.firstName || ''}`.trim() }); } catch (_) {}
                show({ type: 'success', title: 'Saved', message: 'Account changes were saved successfully.' });
              } catch (e) {
                console.error('Failed to save user to DB', e);
                show({ type: 'error', title: 'Save failed', message: 'Failed to save changes. Please try again.' });
              }
                }}
                />
                
                {/* Appointment policy panel */}
                {selected?.id && (
                  <div className={styles.policyPanel}>
                    <h4>Appointment Policy</h4>
                    {policyLoading ? (
                      <div className={styles.helpText}>Loading policy…</div>
                    ) : policyError ? (
                      <div className={styles.errorText}>{policyError}</div>
                    ) : (
                      <div className={styles.policyGrid}>
                        <div className={styles.policyCard}>
                          <h5>Usage & Status</h5>
                          <div className={styles.policyMetric}>
                            <span className={styles.policyLabel}>Chances used</span>
                            <span className={`${styles.policyValue} ${policyInfo.cancelCountCycle >= 3 ? styles.policyValueWarning : ''}`}>
                              {policyInfo.cancelCountCycle} / 3
                            </span>
                          </div>
                          <div className={styles.policyMetric}>
                            <span className={styles.policyLabel}>Chances left</span>
                            <span className={`${styles.policyValue} ${policyInfo.cancelCountCycle >= 3 ? styles.policyValueWarning : styles.policyValueSuccess}`}>
                              {Math.max(0, 3 - (policyInfo.cancelCountCycle || 0))}
                            </span>
                          </div>
                          <div className={styles.policyMetric}>
                            <span className={styles.policyLabel}>Cooldown until</span>
                            <span className={styles.policyValue}>
                              {policyInfo.cooldownUntil ? new Date(policyInfo.cooldownUntil).toLocaleString() : '—'}
                            </span>
                          </div>
                        </div>
                        
                        <div className={styles.policyCard}>
                          <h5>Override Request</h5>
                          <div className={styles.reasonBox}>
                            {(() => {
                              const list = Array.isArray(policyInfo.overrideRequests) ? policyInfo.overrideRequests : [];
                              if (!list.length) return <div className={styles.reasonEmpty}>No override request submitted</div>;
                              const latest = [...list].sort((a,b) => String(b.at||'').localeCompare(String(a.at||'')))[0];
                              return (
                                <div>
                                  <div className={styles.reasonContent}>
                                    <strong>Action:</strong> {latest?.action || '—'}
                                  </div>
                                  <div className={styles.reasonContent} style={{ marginTop: '0.5rem' }}>
                                    {latest?.reason || '—'}
                                  </div>
                                  <div className={styles.reasonMeta}>
                                    {latest?.at ? new Date(latest.at).toLocaleString() : ''}
                                  </div>
                                </div>
                              );
                            })()}
                          </div>
                          <div className={styles.resetActions}>
                            <button
                              className={styles.btnReset}
                              onClick={() => resetUserChances(selected.id)}
                              disabled={resetBusy}
                            >
                              <i className="fas fa-redo" style={{ marginRight: '0.5rem' }}></i>
                              {resetBusy ? 'Resetting…' : 'Reset Chances'}
                            </button>
                            <span className={styles.helpText}>Clears cooldown & requests</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}

        {/* Delete confirmation modal */}
        {deleteTarget && createPortal(
          <div
            className={styles.modalOverlay}
            role="dialog"
            aria-modal="true"
            aria-label="Confirm delete account"
            onClick={() => setDeleteTarget(null)}
          >
            <div className={`${styles.modal} ${styles.modalConfirm}`} onClick={(e) => e.stopPropagation()}>
              <div className={styles.confirmHeader}>
                <div className={styles.confirmTitleWrap}>
                  <span className={styles.confirmIcon} aria-hidden="true">
                    <i className="fas fa-exclamation-triangle"></i>
                  </span>
                  <h3>Remove account?</h3>
                </div>
              </div>
              <div className={styles.confirmBody}>
                <div className={styles.warning}>
                  This action will archive the user record and remove it from the active users list. Authentication accounts are not deleted.
                </div>
                <div className={styles.summaryRow}>
                  <div className={styles.summaryLabel}>User</div>
                  <div className={styles.summaryValue}>{deleteTarget.lastName}, {deleteTarget.firstName}</div>
                </div>
                <div className={styles.summaryRow}>
                  <div className={styles.summaryLabel}>Email</div>
                  <div className={styles.summaryValue}>{deleteTarget.email || '—'}</div>
                </div>
                <div className={styles.summaryRow}>
                  <div className={styles.summaryLabel}>Role</div>
                  <div className={styles.summaryValue}>{deleteTarget.role}</div>
                </div>
              </div>
              <div className={styles.confirmActions}>
                <button className={`${styles.btnSecondary} ${styles.btnCancel}`} onClick={() => setDeleteTarget(null)}>Cancel</button>
                <button
                  className={`${styles.btn} ${styles.btnDangerPrimary} ${styles.btnXL}`}
                  onClick={async () => {
                    try {
                      const nowIso = new Date().toISOString();
                      const archivePayload = { ...deleteTarget, archivedAt: nowIso };
                      await dbSet(ref(usersDB, `usersArchive/${deleteTarget.id}`), archivePayload);
                      await dbRemove(ref(usersDB, `users/${deleteTarget.id}`));
                      setDeleteTarget(null);
                      try { await activityLogService.log({ type: 'account', action: 'delete', description: `Archived & removed account ${deleteTarget.email || deleteTarget.username || deleteTarget.id}`, targetId: deleteTarget.id, targetName: `${deleteTarget.lastName || ''}, ${deleteTarget.firstName || ''}`.trim() }); } catch (_) {}
                      show({ type: 'success', title: 'Removed', message: 'User archived and removed from active list.' });
                    } catch (e) {
                      console.error('Failed to archive/remove user', e);
                      show({ type: 'error', title: 'Delete failed', message: 'Failed to archive user. Please try again.' });
                    }
                  }}
                >
                  Archive & Remove
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
      </main>
    </>
  );
}
