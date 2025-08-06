import React from 'react';
import styles from './AdminNavBar.module.css';
import { Activity } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

export function AdminNavBar() {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <header className={styles.header}>
      <Link to="/admin/dashboard" className={styles.logoLink}>
        <Activity className={styles.logoIcon} />
        <span className={styles.brandName}>
          <span className={styles.textPrimary}>PRIME</span>
          <span className={styles.textSecondary}>LAB</span>
        </span>
      </Link>

      <nav>
        <ul className={styles.navList}>
          <li>
            <Link
              to="/staff-management"
              className={isActive('/admin') ? styles.active : undefined}
            >
              Admin
            </Link>
          </li>
          <li>
            <Link
              to="/admin-dashboard"
              className={isActive('/admin/dashboard') ? styles.active : undefined}
            >
              Dashboard
            </Link>
          </li>
          <li>
            <Link
              to="/admin-reports"
              className={isActive('/admin/reports') ? styles.active : undefined}
            >
              Reports
            </Link>
          </li>
          <li>
            <Link
              to="/admin-settings"
              className={isActive('/admin/settings') ? styles.active : undefined}
            >
              Settings
            </Link>
          </li>
        </ul>
      </nav>

      <div className={styles.userInfo}>
        <span>Admin User</span>
        <i className="fas fa-user-circle"></i>
      </div>
    </header>
  );
}
