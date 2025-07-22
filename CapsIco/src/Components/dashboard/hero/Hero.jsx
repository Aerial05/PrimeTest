import styles from './Hero.module.css';
import doctorImage from '/src/assets/doctor.png'; // adjust path as needed

export default function Hero() {
  return (
    <section className={styles.hero}>
      <div className={styles.container}>
        <div className={styles.left}>
          <h1 className={styles.title}>Your Health is Our Priority</h1>
          <p className={styles.subtitle}>
            PrimeLab Medical Laboratory — Your trusted diagnostics partner for fast, accurate, and accessible healthcare services.
          </p>
        </div>
        <div className={styles.right}>
          <img src={doctorImage} alt="Doctor" className={styles.image} />
        </div>
      </div>
    </section>
  );
}
