import React from 'react';
import styles from './AdminNavBar.module.css';
import { Activity } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useState, useRef, useEffect } from "react";

export function AdminNavBar() {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;


    //PROFILE DROPDOWN
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
  
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, []);

    

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
        </ul>
      </nav>
      
                <div ref={dropdownRef} className={styles.profileWrapper}>
                  <button
                    className={styles.btnIcon}
                    aria-label="User"
                    onClick={toggleDropDown}
                  >
                    <div className={styles.userInfo}>
        <span>Admin User</span>
        <i className="fas fa-user-circle"></i>
      </div>
                  </button>
      
                  {isDropDownOpen && (
                    <div
        className={`${styles.dropDownMenu} ${isDropDownOpen ? styles.show : ''}`}
      >
        {/* lagyan pa ng customization */}
                      <Link to="/admin-settings" className={styles}>
                        View Profile
                      </Link>
                      <Link to="/" className={styles}>
                        Log Out
                      </Link>
                    </div>
                  )}
                </div>
          
    </header>
  );
}
