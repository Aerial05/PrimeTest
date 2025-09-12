import styles from "./NavBar.module.css";
import { Search, User, Calendar } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { NavLink } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth } from "/src/config/firebase-config";


export function NavBar() {
  //PROFILE DROPDOWN
  const [isDropDownOpen, setIsDropDownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [currentUser, setCurrentUser] = useState(null);
  const navigate = useNavigate();

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
    const unsub = onAuthStateChanged(auth, (user) => setCurrentUser(user));
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      unsub();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsDropDownOpen(false);
      navigate("/login");
    } catch (e) {
      // optionally handle error (toast/log)
    }
  };

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
            {currentUser && (
              <span className={styles.usernameText} title={currentUser.email}>
                {currentUser.displayName || (currentUser.email ? currentUser.email.split("@")[0] : "User")}
              </span>
            )}
            <button
              className={styles.btnIcon}
              aria-label="User"
              onClick={toggleDropDown}
            >
              <User />
            </button>

            {isDropDownOpen && (
              <div className={`${styles.dropDownMenu} ${isDropDownOpen ? styles.show : ''}`}>
                {/* lagyan pa ng customization */}
                {currentUser ? (
                  <>
                    <Link to="/profile" className={styles}>View Profile</Link>
                    <a href="#" onClick={(e)=>{e.preventDefault(); handleLogout();}} className={styles}>Log Out</a>
                  </>
                ) : (
                  <>
                    <Link to="/login" className={styles}>Log In</Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        
      </div>
    </nav>
  );
}
