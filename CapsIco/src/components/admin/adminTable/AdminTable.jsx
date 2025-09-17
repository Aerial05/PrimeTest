import React from "react";
import styles from "./AdminTable.module.css";

export function AdminTable({ rows, onEdit, onDelete, onSelect }) {
  // Fallback demo data if no rows provided
  const staffData = rows && rows.length ? rows : [
    { id: 1001, firstName: "John", middleName: "A.", lastName: "Smith", username: "johnsmith", role: "Super Admin", email: "john.smith@primelab.com", phone: "+1 (555) 111-2222", createdAt: "2023-01-15T09:00", lastLoginAt: "2025-09-05T14:22", status: "Active" },
    { id: 1002, firstName: "Sarah", middleName: "", lastName: "Johnson", username: "sarahj", role: "Admin", email: "sarah.j@primelab.com", phone: "+1 (555) 333-4444", createdAt: "2023-03-22T10:00", lastLoginAt: "2025-09-04T09:10", status: "Active" },
    { id: 1003, firstName: "Michael", middleName: "B.", lastName: "Chen", username: "mchen", role: "User", email: "m.chen@primelab.com", phone: "+1 (555) 555-6666", createdAt: "2023-05-10T08:00", lastLoginAt: "2025-08-29T18:45", status: "Inactive" },
  ];

  const fmt = (v) => {
    if (!v) return '';
    try {
      const d = new Date(v);
      if (Number.isNaN(d.getTime())) return String(v);
      return d.toLocaleString();
    } catch {
      return String(v);
    }
  };

  return (
    <div className={styles.card}>
      <div className={styles.tableWrapper}>
        <table className={styles.staffTable}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Username</th>
              <th>Role</th>
              <th>Email</th>
              <th>Phone Number</th>
              <th>Created</th>
              <th>Last Login</th>
              <th>Status</th>
              <th>Actions</th>
              <th>Select</th>
            </tr>
          </thead>
          <tbody>
            {staffData.map((staff) => (
              <tr key={staff.id}>
                <td>{staff.id}</td>
                <td>{`${staff.lastName}, ${staff.firstName}${staff.middleName ? ' ' + staff.middleName : ''}`}</td>
                <td>{staff.username || ''}</td>
                <td>{staff.role}</td>
                <td>{staff.email}</td>
                <td>{staff.phone}</td>
                <td>{fmt(staff.createdAt)}</td>
                <td>{fmt(staff.lastLoginAt)}</td>
                <td>
                  <span
                    className={`${styles.status} ${
                      staff.status.toLowerCase() === "active"
                        ? styles.active
                        : styles.inactive
                    }`}
                  >
                    {staff.status}
                  </span>
                </td>
                <td className={styles.actions}>
                  <button
                    className={`${styles.btn} ${styles.btnEdit}`}
                    onClick={() => onEdit && onEdit(staff)}
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button
                    className={`${styles.btn} ${styles.btnDelete}`}
                    onClick={() => onDelete && onDelete(staff)}
                  >
                    <i className="fas fa-trash"></i>
                  </button>
                </td>
                <td>
                  <button
                    className={`${styles.btn} ${styles.btnSelect}`}
                    onClick={() => onSelect && onSelect(staff)}
                  >
                    Select
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
