import React, { useState } from 'react';
import styles from './AddStaffForm.module.css';

export function AddStaffForm({ onClose, onSubmit }) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    role: '',
    department: '',
    password: '',
    confirmPassword: '',
    status: 'Active',
    joinDate: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    console.log("Form submitted:", formData);
    if (onSubmit) onSubmit(formData);
    if (onClose) onClose();
  };

  return (
    <div className={styles.card}>
      <div className={styles.cardHeader}>
        <h2>Add New Staff/Admin</h2>
        <button className={styles.btnClose} onClick={onClose}>
          <i className="fas fa-times"></i>
        </button>
      </div>
      <div className={styles.cardBody}>
        <form onSubmit={handleSubmit}>
          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="fullName">Full Name</label>
              <input type="text" id="fullName" name="fullName" value={formData.fullName} onChange={handleChange} required />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="email">Email</label>
              <input type="email" id="email" name="email" value={formData.email} onChange={handleChange} required />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="role">Role</label>
              <select id="role" name="role" value={formData.role} onChange={handleChange} required>
                <option value="">Select Role</option>
                <option value="Admin">Admin</option>
                <option value="Staff">Staff</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="department">Department</label>
              <select id="department" name="department" value={formData.department} onChange={handleChange} required>
                <option value="">Select Department</option>
                <option value="Management">Management</option>
                <option value="Laboratory">Laboratory</option>
                <option value="Radiology">Radiology</option>
                <option value="IT">IT</option>
                <option value="Pharmacy">Pharmacy</option>
                <option value="Reception">Reception</option>
              </select>
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="password">Password</label>
              <input type="password" id="password" name="password" value={formData.password} onChange={handleChange} required />
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="confirmPassword">Confirm Password</label>
              <input type="password" id="confirmPassword" name="confirmPassword" value={formData.confirmPassword} onChange={handleChange} required />
            </div>
          </div>

          <div className={styles.formRow}>
            <div className={styles.formGroup}>
              <label htmlFor="status">Status</label>
              <select id="status" name="status" value={formData.status} onChange={handleChange} required>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div className={styles.formGroup}>
              <label htmlFor="joinDate">Join Date</label>
              <input type="date" id="joinDate" name="joinDate" value={formData.joinDate} onChange={handleChange} required />
            </div>
          </div>

          <div className={styles.formActions}>
            <button type="button" className={styles.btnSecondary} onClick={onClose}>Cancel</button>
            <button type="submit" className={styles.btnPrimary}>Add Staff</button>
          </div>
        </form>
      </div>
    </div>
  );
}
