import React from 'react';
import styles from './AdminNavBar.module.css';
import { Activity } from 'lucide-react';

export function AdminNavBar() {
  return (
    <header className={styles.header}>
      <a href="/admin/dashboard" className={styles.logoLink}>
        <Activity className={styles.logoIcon} />
        <span className={styles.brandName}>
          <span className={styles.textPrimary}>PRIME</span>
          <span className={styles.textSecondary}>LAB</span>
        </span>
      </a>
      <nav>
        <ul className={styles.navList}>
          <li><a href="#" className={styles.active}>Admin</a></li>
          <li><a href="/admin/dashboard">Dashboard</a></li>
          <li><a href="#">Reports</a></li>
          <li><a href="#">Settings</a></li>
        </ul>
      </nav>
      <div className={styles.userInfo}>
        <span>Admin User</span>
        <i className="fas fa-user-circle"></i>
      </div>
    </header>
  );
}
