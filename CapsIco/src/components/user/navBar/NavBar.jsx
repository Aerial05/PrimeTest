import styles from "./NavBar.module.css";
import { Search, User } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";

export function NavBar() {
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
    <nav className={styles.nav}>
      <div className={styles.container}>
        <div className={styles.left}>
          <Link to="/" className={styles.navLink}>
            Home
          </Link>
          <Link to="/services" className={styles.navLink}>
            Services
          </Link>
          <Link to="/about" className={styles.navLink}>
            About Us
          </Link>
          <Link to="/contact" className={styles.navLink}>
            Contact
          </Link>
        </div>

        <div className={styles.right}>
          <Link to="/appointment">
            <button className={styles.btnAppointment}>Appointment</button>
          </Link>

          <div ref={dropdownRef} className={styles.profileWrapper}>
            <button
              className={styles.btnIcon}
              aria-label="User"
              onClick={toggleDropDown}
            >
              <User />
            </button>

            {isDropDownOpen && (
              <div
  className={`${styles.dropDownMenu} ${isDropDownOpen ? styles.show : ''}`}
>
  {/* lagyan pa ng customization */}
                <Link to="/profile" className={styles}>
                  View Profile
                </Link>
                <Link to="/" className={styles}>
                  Log Out
                </Link>
              </div>
            )}
          </div>
        </div>

        
      </div>
    </nav>
  );
}
