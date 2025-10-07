import React, { useEffect, useRef, useState } from "react";
import styles from "./AdminNavBar.module.css";
import { User } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import authService from "/src/services/AuthService";

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

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleLogout = async () => {
    try {
      await authService.signOut();
    } catch (err) {
      console.warn("Failed to sign out", err);
    } finally {
      setIsDropDownOpen(false);
      navigate("/login", { replace: true });
    }
  };

  const goToUserSite = () => {
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("preferredDashboard", "user");
        window.dispatchEvent(new CustomEvent("preferred-dashboard-changed", { detail: "user" }));
      }
    } catch (_e) {}
    navigate("/", { replace: true });
  };

  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <nav className={styles.navigation}>
          <ul className={styles.navList}>
            <li>
              <Link
                to="/account-management"
                className={`${styles.navLink} ${isActive("/account-management") ? styles.active : ""}`}
              >
                Account Management
              </Link>
            </li>
            <li>
              <Link
                to="/appointment-management"
                className={`${styles.navLink} ${isActive("/appointment-management") ? styles.active : ""}`}
              >
                Appointment Management
              </Link>
            </li>
            <li>
              <Link
                to="/admin-dashboard"
                className={`${styles.navLink} ${isActive("/admin-dashboard") ? styles.active : ""}`}
              >
                Dashboard
              </Link>
            </li>
            <li>
              <Link
                to="/admin-services"
                className={`${styles.navLink} ${isActive("/admin-services") ? styles.active : ""}`}
              >
                Services
              </Link>
            </li>
            <li>
              <Link
                to="/admin-feedback"
                className={`${styles.navLink} ${isActive("/admin-feedback") ? styles.active : ""}`}
              >
                Feedback
              </Link>
            </li>
          </ul>
        </nav>

        <div ref={dropdownRef} className={styles.profileWrapper}>
          <button type="button" onClick={goToUserSite} className={styles.switchBtn}>
            User Site
          </button>
          <button className={styles.btnIcon} aria-label="User" onClick={toggleDropDown}>
            <div className={styles.userInfo}>
              <span>Super Admin</span>
              <User size={18} />
            </div>
          </button>

          {isDropDownOpen && (
            <div className={`${styles.dropDownMenu} ${isDropDownOpen ? styles.show : ""}`}>
              <Link to="/admin-settings" className={styles.dropDownItem}>
                View Profile
              </Link>
              <button type="button" className={styles.dropDownItem} onClick={handleLogout}>
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
