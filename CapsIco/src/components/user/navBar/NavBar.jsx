import styles from "./NavBar.module.css";
import { Search, User, Calendar, Activity } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { NavLink } from "react-router-dom";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { auth, usersDB } from "/src/config/firebase-config";
import { onValue, ref, update as dbUpdate } from "firebase/database";
import authService from "/src/services/AuthService";


export function NavBar() {
  //PROFILE DROPDOWN
  const [isDropDownOpen, setIsDropDownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [profileName, setProfileName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
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
    let dbUnsub = () => {};
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setProfileName("");
      setIsAdmin(false);
      if (user) {
        const r = ref(usersDB, `users/${user.uid}`);
        dbUnsub();
        dbUnsub = onValue(r, (snap) => {
          const v = snap.exists() ? snap.val() : {};
          const nameFromDb = v.username || [v.firstName, v.lastName].filter(Boolean).join(" ");
          const fallback = user.displayName || (user.email ? user.email.split("@")[0] : "User");
          setProfileName(nameFromDb || fallback);
          const roleIsAdmin = (typeof v.role === 'string' && v.role.toLowerCase() === 'admin');
          setIsAdmin(Boolean(roleIsAdmin));
        });
      } else {
        dbUnsub();
      }
    });
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      unsub();
      dbUnsub();
    };
  }, []);

  const handleLogout = async () => {
    try {
      // No heartbeat/update on logout; lastLoginAt is set on login in App.jsx
      await signOut(auth);
      setIsDropDownOpen(false);
      navigate("/login");
    } catch (e) {
      // optionally handle error (toast/log)
    }
  };

  const goToAdmin = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('preferredDashboard', 'admin');
        window.dispatchEvent(new CustomEvent('preferred-dashboard-changed', { detail: 'admin' }));
      }
    } catch(_e) {}
    navigate('/admin-dashboard', { replace: true });
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
          {isAdmin && (
            <button className={styles.btnAdmin} onClick={goToAdmin} title="Go to Admin">
              <Activity size={18} />
              ADMIN
            </button>
          )}
          <Link to="/appointment">
            <button className={styles.btnAppointment}>
              <Calendar size={18} />
              MAKE AN APPOINTMENT
            </button>
          </Link>

          <div ref={dropdownRef} className={styles.profileWrapper}>
            {currentUser && (
              <span className={styles.usernameText} title={currentUser.email}>
                {profileName}
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
