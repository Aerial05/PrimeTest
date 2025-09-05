import styles from './BookingCard.module.css';
import { Link } from 'react-router-dom';
import { Calendar } from 'lucide-react';

export function BookingCard() {
  return (
    <div className={styles.container}>
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
