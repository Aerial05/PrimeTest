import React, { useState, useEffect } from 'react';
import styles from './AddAdminForm.module.css';

export function AddAdminForm({ onClose, onSubmit, mode = 'add', initialData }) {
  const toLocalDatetime = (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,16);
  const isoToLocalDatetime = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return toLocalDatetime(d);
  };
  const nowLocal = toLocalDatetime();
  const [formData, setFormData] = useState(() => ({
    id: initialData?.id ?? Date.now(),
    firstName: initialData?.firstName ?? '',
    middleName: initialData?.middleName ?? '',
    lastName: initialData?.lastName ?? '',
    email: initialData?.email ?? '',
    phone: initialData?.phone ?? '',
    role: initialData?.role ?? 'User',
    status: initialData?.status ?? 'Active',
  joinDate: initialData?.joinDate ? isoToLocalDatetime(initialData.joinDate) : nowLocal,
  lastActive: initialData?.lastActive ? isoToLocalDatetime(initialData.lastActive) : nowLocal,
  }));

  // Sync when switching between different users while the modal is open
  useEffect(() => {
    const next = {
      id: initialData?.id ?? Date.now(),
      firstName: initialData?.firstName ?? '',
      middleName: initialData?.middleName ?? '',
      lastName: initialData?.lastName ?? '',
      email: initialData?.email ?? '',
      phone: initialData?.phone ?? '',
      role: initialData?.role ?? 'User',
      status: initialData?.status ?? 'Active',
  joinDate: initialData?.joinDate ? isoToLocalDatetime(initialData.joinDate) : toLocalDatetime(),
  lastActive: initialData?.lastActive ? isoToLocalDatetime(initialData.lastActive) : toLocalDatetime(),
    };
    setFormData(next);
  }, [initialData, mode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Account form submitted:", formData);
    if (onSubmit) onSubmit(formData);
    if (onClose) onClose();
  };

  // Separate change password section (optional)
  const [newPwd, setNewPwd] = useState('');
  const [newPwdConfirm, setNewPwdConfirm] = useState('');
  const [pwdError, setPwdError] = useState('');
  const onSavePassword = (e) => {
    e.preventDefault();
    setPwdError('');
    if (!newPwd || !newPwdConfirm) {
      setPwdError('Please enter and confirm the new password.');
      return;
    }
    if (newPwd.length < 6) {
      setPwdError('Password must be at least 6 characters.');
      return;
    }
    if (newPwd !== newPwdConfirm) {
      setPwdError('Passwords do not match.');
      return;
    }
    console.log('Changed password for user', formData.id);
    alert('Password updated.');
    setNewPwd('');
    setNewPwdConfirm('');
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2>Account Details Management</h2>
        <button className={styles.btnClose} onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
      </div>
      <div className={styles.cardBody}>
        <form onSubmit={handleSubmit}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="id">User ID</label>
              <input type="text" id="id" value={formData.id} readOnly />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="firstName">First Name</label>
              <input type="text" id="firstName" name="firstName" value={formData.firstName} onChange={handleChange} required />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="middleName">Middle Name</label>
              <input type="text" id="middleName" name="middleName" value={formData.middleName} onChange={handleChange} />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="lastName">Last Name</label>
              <input type="text" id="lastName" name="lastName" value={formData.lastName} onChange={handleChange} required />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="email">Email</label>
              <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="phone">Phone Number</label>
              <input type="tel" id="phone" name="phone" value={formData.phone} onChange={handleChange} />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="role">Role</label>
              <select
                id="role"
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
                // If editing an existing account, role comes from DB; keep editable but only Admin/User
              >
                <option value="Admin">Admin</option>
                <option value="User">User</option>
              </select>
            </div>
          </div>

          {/* Password fields removed from main details form */}

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="joinDate">Join Date</label>
              <input type="datetime-local" id="joinDate" name="joinDate" value={formData.joinDate} readOnly />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="lastActive">Last Active</label>
              <input type="datetime-local" id="lastActive" name="lastActive" value={formData.lastActive} readOnly />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="status">Status</label>
              <select id="status" name="status" value={formData.status} onChange={handleChange} required>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
          </div>

          <div className={styles.formActions}>
            <button type="button" className={styles.btnSecondary} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.btnPrimary}>Add Account</button>
            <button type="submit" className={styles.btnPrimary}>Save Changes</button>
          </div>
        </form>

        {/* Separate Change Password section (for editing) */}
        <form onSubmit={onSavePassword} style={{ marginTop: '1rem' }}>
          <h3>Change Password</h3>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="newPassword">New Password</label>
              <input type="password" id="newPassword" value={newPwd} onChange={(e)=>setNewPwd(e.target.value)} />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="confirmNewPassword">Confirm New Password</label>
              <input type="password" id="confirmNewPassword" value={newPwdConfirm} onChange={(e)=>setNewPwdConfirm(e.target.value)} />
            </div>
          </div>
          {pwdError && <div style={{ color:'crimson', marginBottom: '.5rem' }}>{pwdError}</div>}
          <div className={styles.formActions}>
            <button type="submit" className={styles.btnPrimary}>Save Password</button>
          </div>
        </form>
      </div>
    </div>
  );
}
