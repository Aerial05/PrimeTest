import React from 'react';
import styles from './SettingsSidebar.module.css';

const menuItems = [
  { label: 'Profile', icon: 'fas fa-user' },
  { label: 'Organization', icon: 'fas fa-building' },
  { label: 'Notifications', icon: 'fas fa-bell' },
  { label: 'Security', icon: 'fas fa-shield-alt' },
  { label: 'Appearance', icon: 'fas fa-palette' },
  { label: 'Email', icon: 'fas fa-envelope' },
  { label: 'Backup', icon: 'fas fa-database' },
  { label: 'System', icon: 'fas fa-cog' },
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
