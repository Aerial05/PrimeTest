import styles from "./NavBar.module.css";
import { Search, User, Calendar } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { NavLink } from "react-router-dom";


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
          <NavLink 
  to="/" 
  className={({ isActive }) => isActive ? `${styles.navLink} ${styles.active}` : styles.navLink}
>
  HOME
</NavLink>

<NavLink 
  to="/services" 
  className={({ isActive }) => isActive ? `${styles.navLink} ${styles.active}` : styles.navLink}
>
  SERVICES
</NavLink>

<NavLink 
  to="/about" 
  className={({ isActive }) => isActive ? `${styles.navLink} ${styles.active}` : styles.navLink}
>
  ABOUT US
</NavLink>

<NavLink 
  to="/contact" 
  className={({ isActive }) => isActive ? `${styles.navLink} ${styles.active}` : styles.navLink}
>
  CONTACT
</NavLink>

        </div>

        <div className={styles.right}>
          <Link to="/appointment">
            <button className={styles.btnAppointment}>
              <Calendar size={18} />
              MAKE AN APPOINTMENT
            </button>
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
                <Link to="/login" className={styles}>
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
