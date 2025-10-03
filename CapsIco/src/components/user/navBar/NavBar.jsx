import styles from './NavBar.module.css';
import { User, Calendar, Activity } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, usersDB } from '/src/config/firebase-config';
import { onValue, ref } from 'firebase/database';

export function NavBar() {
  const [isDropDownOpen, setIsDropDownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [profileName, setProfileName] = useState('');
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

    document.addEventListener('mousedown', handleClickOutside);
    let dbUnsub = () => {};
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setProfileName('');
      setIsAdmin(false);
      if (user) {
        const userRef = ref(usersDB, `users/${user.uid}`);
        dbUnsub();
        dbUnsub = onValue(userRef, (snap) => {
          const v = snap.exists() ? snap.val() : {};
          const nameFromDb = v.username || [v.firstName, v.lastName].filter(Boolean).join(' ');
          const fallback = user.displayName || (user.email ? user.email.split('@')[0] : 'User');
          setProfileName(nameFromDb || fallback);
          const roleIsAdmin = (() => {
            const raw = v.role;
            if (!raw) return false;
            const s = String(raw).trim().toLowerCase();
            return s === 'admin' || s === 'super admin' || s === 'super_admin' || s === 'superadmin';
          })();
          setIsAdmin(Boolean(roleIsAdmin));
        });
      } else {
        dbUnsub();
      }
    });

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      unsub();
      dbUnsub();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setIsDropDownOpen(false);
      navigate('/login');
    } catch (e) {
      // optional error handling
    }
  };

  const goToAdmin = () => {
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('preferredDashboard', 'admin');
        window.dispatchEvent(new CustomEvent('preferred-dashboard-changed', { detail: 'admin' }));
      }
    } catch (_e) {}
    navigate('/admin-dashboard', { replace: true });
  };

  return (
    <nav className={styles.nav}>
      <div className={styles.container}>
        <div className={styles.left}>
          <NavLink
            to="/"
            className={({ isActive }) => (isActive ? `${styles.navLink} ${styles.active}` : styles.navLink)}
          >
            HOME
          </NavLink>
          <NavLink
            to="/services"
            className={({ isActive }) => (isActive ? `${styles.navLink} ${styles.active}` : styles.navLink)}
          >
            SERVICES
          </NavLink>
          <NavLink
            to="/about"
            className={({ isActive }) => (isActive ? `${styles.navLink} ${styles.active}` : styles.navLink)}
          >
            ABOUT US
          </NavLink>
          <NavLink
            to="/contact"
            className={({ isActive }) => (isActive ? `${styles.navLink} ${styles.active}` : styles.navLink)}
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
            <button className={styles.btnIcon} aria-label="User" onClick={toggleDropDown}>
              <User />
            </button>

            {isDropDownOpen && (
              <div className={`${styles.dropDownMenu} ${isDropDownOpen ? styles.show : ''}`}>
                {currentUser ? (
                  <>
                    <Link to="/profile">View Profile</Link>
                    <Link to="/settings?tab=history">Appointment History</Link>
                    <a
                      href="#"
                      onClick={(e) => {
                        e.preventDefault();
                        handleLogout();
                      }}
                    >
                      Log Out
                    </a>
                  </>
                ) : (
                  <Link to="/login">Log In</Link>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
