import styles from './BookingCard.module.css';
import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';

// align: 'center' | 'left'
export function BookingCard({ align = 'center' }) {
  const containerClass = `${styles.container} ${align === 'left' ? styles.left : ''}`;
  return (
    <div className={containerClass}>
      <Link to="/appointment" className={styles.card}>
        <Calendar className={styles.icon} />
        <div className={styles.content}>
          <span className={styles.title}>Book an appointment</span>
          <span className={styles.subtitle}>Fast and Secure</span>
        </div>
      </Link>
    </div>
  );
}
