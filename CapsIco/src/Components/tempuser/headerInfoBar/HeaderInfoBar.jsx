import styles from './HeaderInfoBar.module.css';
import { Activity, Phone, Clock, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';

export function HeaderInfoBar() {
  return (
    <header className={styles.siteHeader}>
      <div className={styles.container}>
        <div className={styles.headerContent}>
          <Link to="/dashboard" className={styles.logoLink}>
            <Activity className={styles.logoIcon} />
            <span className={styles.brandName}>
              <span className={styles.textPrimary}>PRIME</span>
              <span className={styles.textSecondary}>LAB</span>
            </span>
          </Link>

          <div className={styles.contactInfo}>
            <div className={styles.infoItem}>
              <Phone className={styles.infoIcon} />
              <div className={styles.infoText}>
                <span className={styles.infoLabel}>EMERGENCY</span>
                <a href="tel:0926-638-6300" className={styles.infoValue}>0926-638-6300</a>
              </div>
            </div>

            <div className={styles.infoItem}>
              <Clock className={styles.infoIcon} />
              <div className={styles.infoText}>
                <span className={styles.infoLabel}>WORK HOUR</span>
                <span className={styles.infoValue}>07:00 - 17:00 Everyday</span>
              </div>
            </div>

            <div className={styles.infoItem}>
              <MapPin className={styles.infoIcon} />
              <div className={styles.infoText}>
                <span className={styles.infoLabel}>LOCATION</span>
                <span className={styles.infoValue}>Bulihan, Malolos, Bulacan</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
