import React from 'react';
import styles from './SettingsSidebar.module.css';

const menuItems = [
  { label: 'Profile', icon: 'fas fa-user' },
  { label: 'Appearance', icon: 'fas fa-palette' },
  { label: 'Rules and Regulations', icon: 'fas fa-envelope' },
  { label: 'Appointment Histories', icon: 'fas fa-database' },

];

export function SettingsSidebar() {
  return (
    <div className={styles.sidebar}>
      <ul className={styles.menu}>
        {menuItems.map((item, index) => (
          <li key={index}>
            <a href="#" className={`${styles.link} ${index === 0 ? styles.active : ''}`}>
              <i className={item.icon}></i>
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
