import React, { useState } from 'react';
import styles from './AccountManagement.module.css';
import { AdminTable } from '/src/components/admin/adminTable/AdminTable';
import { AddAdminForm } from '/src/components/admin/adminForm/AddAdminForm';

export function AccountManagement() {
  const [showAdd, setShowAdd] = useState(false);
  const [mode, setMode] = useState('add');
  const [selected, setSelected] = useState(null);
  const [rows, setRows] = useState([
    { id: 1001, firstName: 'John', middleName: 'A.', lastName: 'Smith', role: 'Super Admin', email: 'john.smith@primelab.com', phone: '+1 (555) 111-2222', joinDate: '2023-01-15T09:00', lastActive: '2025-09-05T14:22', status: 'Active' },
    { id: 1002, firstName: 'Sarah', middleName: '', lastName: 'Johnson', role: 'Admin', email: 'sarah.j@primelab.com', phone: '+1 (555) 333-4444', joinDate: '2023-03-22T10:00', lastActive: '2025-09-04T09:10', status: 'Active' },
    { id: 1003, firstName: 'Michael', middleName: 'B.', lastName: 'Chen', role: 'User', email: 'm.chen@primelab.com', phone: '+1 (555) 555-6666', joinDate: '2023-05-10T08:00', lastActive: '2025-08-29T18:45', status: 'Inactive' },
  ]);

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
          <AdminTable rows={rows} onEdit={(row) => { setSelected(row); setMode('edit'); setShowAdd(true); }} onDelete={(row) => setRows(prev => prev.filter(r => r.id !== row.id))} />
        </div>
        {showAdd && (
          <AddAdminForm
            mode={mode}
            initialData={selected}
            onClose={() => setShowAdd(false)}
            onSubmit={(data) => {
              setRows(prev => {
                const exists = prev.some(r => r.id === data.id);
                if (exists) {
                  return prev.map(r => (r.id === data.id ? { ...r, ...data } : r));
                }
                return [{ ...data }, ...prev];
              });
              setShowAdd(false);
            }}
          />
        )}
      </main>
    </>
  );
}
