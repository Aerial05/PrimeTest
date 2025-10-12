import styles from './NavBar.module.css';
import { User, Calendar, Activity, Star } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, usersDB } from '/src/config/firebase-config';
import { onValue, ref, query, orderByChild, equalTo } from 'firebase/database';

export function NavBar() {
  const [isDropDownOpen, setIsDropDownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [profileName, setProfileName] = useState('');
  const [profilePhoto, setProfilePhoto] = useState('');
  const [notifCount, setNotifCount] = useState(0);
  const [feedbackCount, setFeedbackCount] = useState(0);
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
    let apptUnsub = () => {};
    const unsub = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setProfileName('');
      setProfilePhoto('');
      setIsAdmin(false);
      setNotifCount(0);
      if (user) {
        const userRef = ref(usersDB, `users/${user.uid}`);
        dbUnsub();
        dbUnsub = onValue(userRef, (snap) => {
          const v = snap.exists() ? snap.val() : {};
          const nameFromDb = v.username || [v.firstName, v.lastName].filter(Boolean).join(' ');
          const fallback = user.displayName || (user.email ? user.email.split('@')[0] : 'User');
          setProfileName(nameFromDb || fallback);
          const photo = v.photoURL || user.photoURL || '';
          setProfilePhoto(photo || '');
          const roleIsAdmin = (() => {
            const raw = v.role;
            if (!raw) return false;
            const s = String(raw).trim().toLowerCase();
            return s === 'admin' || s === 'super admin' || s === 'super_admin' || s === 'superadmin';
          })();
          setIsAdmin(Boolean(roleIsAdmin));
        });

        // Subscribe to user's appointments and compute notification count
        const apptQ = query(ref(usersDB, 'appointments'), orderByChild('USER_ID'), equalTo(user.uid));
        apptUnsub();
        apptUnsub = onValue(apptQ, (snap) => {
          if (!snap.exists()) { setNotifCount(0); return; }
          const obj = snap.val() || {};
          const now = Date.now();
          let actionCount = 0;
          let fbCount = 0;
          const isDoneLike = (status) => /complete|completed|success|successful|successfully|done|finished/i.test(String(status||''));
          const isCanceledLike = (status) => /cancel|canceled|cancelled|declined|rejected|denied/i.test(String(status||''));
          const isApprovedLike = (status) => /approved|rescheduled/i.test(String(status||''));
          const isPendingLike = (status) => /pending|waiting|in[\s_-]?review|processing/i.test(String(status||''));
          const parseDT = (dateStr, timeStr) => {
            try {
              const d = String(dateStr||'').trim();
              const t = String(timeStr||'').trim();
              if (!d) return null;
              // Try ISO
              let s = d;
              if (t) s += `T${t}`;
              let dt = new Date(s);
              if (Number.isNaN(dt.getTime())) {
                // Fallback: date only
                dt = new Date(d);
              }
              if (Number.isNaN(dt.getTime())) return null;
              return dt.getTime();
            } catch { return null; }
          };
          for (const appt of Object.values(obj)) {
            const status = appt?.BOOKING_STATUS || appt?.STATUS || '';
            const whenMs = parseDT(appt?.DATE_OF_APPOINTMENT, appt?.TIME_SLOT);
            const hasFeedback = !!appt?.FEEDBACK;
            // Only count items that actually need attention:
            // - Pending-like statuses (regardless of date)
            // - Approved/Rescheduled but still upcoming
            // Exclude completed/successful and canceled/declined
            if (isDoneLike(status)) {
              if (!hasFeedback) fbCount += 1;
              continue;
            }
            if (isCanceledLike(status)) continue;
            if (isPendingLike(status)) { actionCount += 1; continue; }
            if (isApprovedLike(status)) {
              const upcoming = (whenMs == null) ? true : (whenMs > now);
              if (upcoming) actionCount += 1;
            }
          }
          setNotifCount(actionCount);
          setFeedbackCount(fbCount);
        });
      } else {
        dbUnsub();
        apptUnsub();
      }
    });

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      unsub();
      dbUnsub();
      apptUnsub();
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

          {feedbackCount > 0 && (
            <Link to="/settings?tab=appointments" title={`You have ${feedbackCount} feedback ${feedbackCount>1?'requests':'request'}`}>
              <button className={styles.btnFeedback} aria-label="Give feedback">
                <Star size={16} />
                Give Feedback
                <span className={styles.feedbackCount}>{feedbackCount > 99 ? '99+' : feedbackCount}</span>
              </button>
            </Link>
          )}

          <div ref={dropdownRef} className={styles.profileWrapper}>
            {currentUser && (
              <span className={styles.usernameText} title={currentUser.email}>
                {profileName}
              </span>
            )}
            <button
              className={`${styles.btnIcon} ${profilePhoto ? styles.btnIconAvatar : ''}`}
              aria-label="User"
              onClick={toggleDropDown}
              title={
                notifCount > 0
                  ? `${notifCount} appointment${notifCount>1?'s':''} need attention`
                  : (feedbackCount > 0 ? `${feedbackCount} feedback ${feedbackCount>1?'requests':'request'} pending` : undefined)
              }
            >
              {profilePhoto ? (
                <span className={styles.avatarBtn}>
                  <img src={profilePhoto} alt="Me" className={styles.avatarImg} />
                </span>
              ) : (
                <User />
              )}
              {notifCount > 0 && (
                <span className={styles.notifBadge}>{notifCount > 99 ? '99+' : notifCount}</span>
              )}
              {feedbackCount > 0 && (
                <span className={styles.feedbackDot} aria-hidden />
              )}
            </button>

            {isDropDownOpen && (
              <div className={`${styles.dropDownMenu} ${isDropDownOpen ? styles.show : ''}`}>
                {currentUser ? (
                  <>
                    <Link to="/profile">View Profile</Link>
                    <Link to="/settings?tab=appointments">Appointments</Link>
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
