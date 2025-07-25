import styles from './AboutContent.module.css';

export function AboutContent() {
  return (
    <section className={styles.aboutSection}>
      <div className={styles.container}>
        <h1 className={styles.title}>About PrimeLab</h1>
        <div className={styles.grid}>
          
          <div className={styles.textColumn}>
            <p className={styles.paragraph}>
              PrimeLab is a state-of-the-art medical laboratory dedicated to providing precise and timely diagnostic services. With over 20 years of experience, we have established ourselves as a trusted partner in healthcare.
            </p>
            <p className={styles.paragraph}>
              Our team of expert pathologists, technicians, and support staff work tirelessly to ensure that every test is conducted with the utmost accuracy and care. We utilize cutting-edge technology and adhere to strict quality control measures to deliver reliable results.
            </p>
            <p className={styles.paragraph}>
              At PrimeLab, we believe in the power of preventive healthcare and aim to empower individuals and healthcare providers with the information they need to make informed decisions about health and wellness.
            </p>
          </div>

          {/* Right column - mission and vision */}
          <div className={styles.card}>
            <h2 className={styles.subheading}>Our Mission</h2>
            <p className={styles.paragraph}>
              To provide accurate, timely, and affordable diagnostic services that contribute to better health outcomes for our community.
            </p>
            <h2 className={styles.subheading}>Our Vision</h2>
            <p className={styles.paragraph}>
              To be the leading medical laboratory, known for excellence in diagnostics, research, and patient care.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
