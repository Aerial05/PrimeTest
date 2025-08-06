import React from 'react';
import styles from './RecentActivity.module.css';

const activities = [
  {
    iconClass: 'fas fa-user-plus',
    bgColor: 'rgba(232, 62, 140, 0.2)',
    color: '#e83e8c',
    title: 'New Staff Added',
    description: 'Dr. James Wilson was added to Radiology department',
    time: '10 minutes ago',
  },
  {
    iconClass: 'fas fa-calendar-plus',
    bgColor: 'rgba(52, 152, 219, 0.2)',
    color: '#3498db',
    title: 'Appointment Scheduled',
    description: '15 new appointments were scheduled for tomorrow',
    time: '45 minutes ago',
  },
  {
    iconClass: 'fas fa-check-circle',
    bgColor: 'rgba(46, 204, 113, 0.2)',
    color: '#2ecc71',
    title: 'System Update',
    description: 'System successfully updated to version 2.4.5',
    time: '2 hours ago',
  },
  {
    iconClass: 'fas fa-exclamation-triangle',
    bgColor: 'rgba(241, 196, 15, 0.2)',
    color: '#f1c40f',
    title: 'Low Supply Alert',
    description: 'Laboratory reagent supplies are running low',
    time: '5 hours ago',
  },
  {
    iconClass: 'fas fa-user-edit',
    bgColor: 'rgba(155, 89, 182, 0.2)',
    color: '#9b59b6',
    title: 'Profile Updated',
    description: 'Sarah Johnson updated her contact information',
    time: 'Yesterday',
  },
];

export function RecentActivity() {
  return (
    <div className={styles.recentActivity}>
      <div className={styles.cardHeader}>
        <h2>Recent Activity</h2>
        <button className={styles.refreshBtn}>
          <i className="fas fa-sync-alt"></i> Refresh
        </button>
      </div>

      <div className={styles.activityList}>
        {activities.map((activity, index) => (
          <div key={index} className={styles.activityItem}>
            <div
              className={styles.activityIcon}
              style={{ backgroundColor: activity.bgColor, color: activity.color }}
            >
              <i className={activity.iconClass}></i>
            </div>
            <div className={styles.activityDetails}>
              <h4>{activity.title}</h4>
              <p>{activity.description}</p>
            </div>
            <div className={styles.activityTime}>{activity.time}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
