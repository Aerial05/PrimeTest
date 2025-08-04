import React, { useState } from 'react';

import { StaffTable } from '/src/components/admin/staffTable/StaffTable';
import { AddStaffForm } from '/src/components/admin/staffForm/AddStaffForm';
import styles from './StaffManagement.module.css';

export function StaffManagement() {
  const [showForm, setShowForm] = useState(false);

  const handleAddClick = () => setShowForm(true);
  const handleCloseForm = () => setShowForm(false);

  return (
    <>

      <div className={styles.banner}>
        <div className={styles.bannerContainer}>
          <p>Admin</p>
          <h1>Staff Management</h1>
        </div>
      </div>

      <main className={styles.main}>
        <div className={styles.card}>
          <div className={styles.cardHeader}>
            <h2>Staff & Admin List</h2>
            <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={handleAddClick}>
              <i className="fas fa-plus"></i> Add New
            </button>
          </div>
          <StaffTable />
        </div>

        {showForm && <AddStaffForm onClose={handleCloseForm} />}
      </main>
    </>
  );
}
