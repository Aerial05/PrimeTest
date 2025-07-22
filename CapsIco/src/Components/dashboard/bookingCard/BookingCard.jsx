import styles from './BookingCard.module.css';
import { Phone, ClipboardList, Clock } from 'lucide-react';

export default function BookingCard() {
  return (
    <section className={styles.gridSection}>
      <div className={styles.card}>
        <Phone className={styles.icon} />
        <h3 className={styles.title}>Emergency Hotline</h3>
        <p>0926-638-6300</p>
      </div>

      <div className={styles.card}>
        <ClipboardList className={styles.icon} />
        <h3 className={styles.title}>Book Appointment</h3>
        <p>Get results fast & efficiently</p>
      </div>

      <div className={styles.card}>
        <Clock className={styles.icon} />
        <h3 className={styles.title}>Opening Hours</h3>
        <p>07:00 - 17:00 Daily</p>
      </div>
    </section>
  );
}
