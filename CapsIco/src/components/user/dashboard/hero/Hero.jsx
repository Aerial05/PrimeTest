import styles from './Hero.module.css';

export function Hero() {
  return (
    <section className={styles.heroSection}>
      <div className={styles.container}>
        <div className={styles.heroContent}>
          {/* Left Text */}
          <div className={styles.textBlock}>
            <div className={styles.label}>EXCEPTIONAL CARE</div>
            <h1 className={styles.heading}>
              PrimeLab Appoint:
              <br />
              Precision in Every Appointment
            </h1>
            <a href="/services">
              <button className={styles.button}>Our Services</button>
            </a>
          </div>

          {/* Right Image Embed */}
          <div className={styles.embed}>
            <iframe
              width="600"
              height="350"
              frameBorder="0"
              src="https://momento360.com/e/u/093bc95c7bd148379ca514359ad13feb?utm_campaign=embed&utm_source=other&heading=-34.4&pitch=4&field-of-view=75&size=medium&display-plan=true"
              allowFullScreen
              title="PrimeLab 360 View"
            ></iframe>
          </div>
        </div>
      </div>
    </section>
  );
}
