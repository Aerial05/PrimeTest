import styles from './BookingCard.module.css';

export function BookingCard() {
  return (
    <div className={styles.container}>
      
        <div className={styles.card}>
          <a href="/appointment">
          <span className={styles.text}>Click here to book an Appointment!</span>
          <div className={styles.iconContainer}>
            <svg
              className={styles.icon}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
          </div>
          </a>
        </div>
    </div>
  );
}
