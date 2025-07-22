import styles from './NavBar.module.css';
import { Search, User } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function NavBar() {
  return (
    <nav className={styles.nav}>
      <div className={styles.container}>
        <div className={styles.left}>
          <Link to="/dashboard" className={styles.navLink}>Home</Link>
          <Link to="/services" className={styles.navLink}>Services</Link>
          <Link to="/about" className={styles.navLink}>About Us</Link>
          <Link to="/contact" className={styles.navLink}>Contact</Link>
        </div>

        <div className={styles.right}>
          <button className={styles.btnIcon} aria-label="Search">
            <Search />
          </button>
          <Link to="/user-profile">
            <button className={styles.btnIcon} aria-label="User">
              <User />
            </button>
          </Link>
          <Link to="/appointment">
            <button className={styles.btnAppointment}>Appointment</button>
          </Link>
          <Link to="/login">
            <button className={styles.btnLogout}>Log out</button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
