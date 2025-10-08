import React from 'react';
import styles from './SettingsSidebar.module.css';

const menuItems = [
  { id: 'profile', label: 'Profile', icon: 'fas fa-user' },
  { id: 'backup', label: 'Backup', icon: 'fas fa-database' },
  { id: 'system', label: 'System', icon: 'fas fa-cog' },
];

export function SettingsSidebar({ active = 'profile', onSelect }) {
  return (
    <div className={styles.sidebar}>
      <ul className={styles.menu}>
        {menuItems.map((item) => (
          <li key={item.id}>
            <button
              type="button"
              className={`${styles.link} ${active === item.id ? styles.active : ''}`}
              onClick={() => onSelect && onSelect(item.id)}
            >
              <i className={item.icon}></i>
              {item.label}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
