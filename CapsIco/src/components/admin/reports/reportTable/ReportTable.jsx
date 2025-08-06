import React from 'react';
import styles from './ReportTable.module.css';

export function ReportTable() {
  const staffReports = [
    {
      name: 'John Smith',
      department: 'Management',
      attendance: '98%',
      tasks: '45/48',
      rating: '4.9',
      performance: 'Excellent',
    },
    {
      name: 'Sarah Johnson',
      department: 'Laboratory',
      attendance: '95%',
      tasks: '52/60',
      rating: '4.7',
      performance: 'Excellent',
    },
    {
      name: 'Michael Chen',
      department: 'Radiology',
      attendance: '92%',
      tasks: '38/45',
      rating: '4.5',
      performance: 'Good',
    },
    {
      name: 'Emily Davis',
      department: 'IT',
      attendance: '97%',
      tasks: '32/35',
      rating: '4.8',
      performance: 'Excellent',
    },
    {
      name: 'Robert Wilson',
      department: 'Pharmacy',
      attendance: '88%',
      tasks: '42/55',
      rating: '4.2',
      performance: 'Needs Improvement',
    },
    {
      name: 'Jennifer Lee',
      department: 'Laboratory',
      attendance: '94%',
      tasks: '48/50',
      rating: '4.6',
      performance: 'Good',
    },
    {
      name: 'David Brown',
      department: 'Radiology',
      attendance: '91%',
      tasks: '40/45',
      rating: '4.4',
      performance: 'Good',
    },
  ];

  return (
    <div className={styles.tableResponsive}>
      <table className={styles.reportTable}>
        <thead>
          <tr>
            <th>Staff Name</th>
            <th>Department</th>
            <th>Attendance</th>
            <th>Tasks Completed</th>
            <th>Avg. Rating</th>
            <th>Performance</th>
          </tr>
        </thead>
        <tbody>
          {staffReports.map((report, index) => (
            <tr key={index}>
              <td>{report.name}</td>
              <td>{report.department}</td>
              <td>{report.attendance}</td>
              <td>{report.tasks}</td>
              <td>{report.rating}</td>
              <td>
                <span
                  className={`${styles.status} ${
                    report.performance === 'Needs Improvement'
                      ? styles.inactive
                      : styles.active
                  }`}
                >
                  {report.performance}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
