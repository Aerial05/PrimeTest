import React, { useEffect, useRef, useState } from 'react';
import styles from './AdminNavBar.module.css';
import { Activity } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import authService from '/src/services/AuthService';
import { ref, update as dbUpdate } from 'firebase/database';
import { auth, usersDB } from '@/config/firebase-config';

export function AdminNavBar() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname === path;

  const [isDropDownOpen, setIsDropDownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const toggleDropDown = () => {
    setIsDropDownOpen((prev) => !prev);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropDownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      // No DB writes on logout; lastLoginAt is set on sign-in
      await authService.signOut();
    } catch (err) {
      console.warn('Failed to sign out', err);
    } finally {
      setIsDropDownOpen(false);
      navigate('/login', { replace: true });
    }
  };

  return (
    <header className={styles.header}>
      <Link to="/admin-dashboard" className={styles.logoLink}>
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
              to="/account-management"
              className={isActive('/account-management') ? styles.active : undefined}
            >
              Account Management
            </Link>
          </li>
          <li>
            <Link
              to="/staff-management"
              className={isActive('/staff-management') ? styles.active : undefined}
            >
              Appointments
            </Link>
          </li>
          <li>
            <Link
              to="/admin-dashboard"
              className={isActive('/admin-dashboard') ? styles.active : undefined}
            >
              Dashboard
            </Link>
          </li>
          <li>
            <Link
              to="/admin-reports"
              className={isActive('/admin-reports') ? styles.active : undefined}
            >
              Reports
            </Link>
          </li>
          <li>
            <Link
              to="/admin-packages"
              className={isActive('/admin-packages') ? styles.active : undefined}
            >
              Packages
            </Link>
          </li>
          <li>
            <Link
              to="/admin-messages"
              className={isActive('/admin-messages') ? styles.active : undefined}
            >
              Messages
            </Link>
          </li>
        </ul>
      </nav>

      <div ref={dropdownRef} className={styles.profileWrapper}>
        <button
          className={styles.btnIcon}
          aria-label="User"
          onClick={toggleDropDown}
        >
          <div className={styles.userInfo}>
            <span>Super Admin</span>
            <i className="fas fa-user-circle"></i>
          </div>
        </button>

        {isDropDownOpen && (
          <div className={`${styles.dropDownMenu} ${isDropDownOpen ? styles.show : ''}`}>
            <Link to="/admin-settings" className={styles.dropDownItem}>
              View Profile
            </Link>
            <button type="button" className={styles.dropDownItem} onClick={handleLogout}>
              Log Out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

