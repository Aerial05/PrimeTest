import React from "react";
import styles from "./StaffTable.module.css";

export function StaffTable({ onEdit, onDelete }) {
  const staffData = [
    {
      name: "John Smith",
      role: "Admin",
      email: "john.smith@primelab.com",
      department: "Management",
      joinDate: "01/15/2023",
      status: "Active",
    },
    {
      name: "Sarah Johnson",
      role: "Staff",
      email: "sarah.j@primelab.com",
      department: "Laboratory",
      joinDate: "03/22/2023",
      status: "Active",
    },
    {
      name: "Michael Chen",
      role: "Staff",
      email: "m.chen@primelab.com",
      department: "Radiology",
      joinDate: "05/10/2023",
      status: "Inactive",
    },
    {
      name: "Emily Davis",
      role: "Admin",
      email: "e.davis@primelab.com",
      department: "IT",
      joinDate: "02/05/2023",
      status: "Active",
    },
    {
      name: "Robert Wilson",
      role: "Staff",
      email: "r.wilson@primelab.com",
      department: "Pharmacy",
      joinDate: "07/18/2023",
      status: "Active",
    },
  ];

  return (
    <div className={styles.card}>
      <div className={styles.tableResponsive}>
        <table className={styles.staffTable}>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Email</th>
              <th>Department</th>
              <th>Join Date</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {staffData.map((staff, index) => (
              <tr key={index}>
                <td>{staff.name}</td>
                <td>{staff.role}</td>
                <td>{staff.email}</td>
                <td>{staff.department}</td>
                <td>{staff.joinDate}</td>
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
                    onClick={() => onEdit(staff)}
                  >
                    <i className="fas fa-edit"></i>
                  </button>
                  <button
                    className={`${styles.btn} ${styles.btnDelete}`}
                    onClick={() => onDelete(staff)}
                  >
                    <i className="fas fa-trash"></i>
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
