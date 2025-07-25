import { useEffect } from 'react';
import styles from './ContactInfoGrid.module.css';
import { createIcons, icons } from 'lucide';

export function ContactInfoGrid() {
  useEffect(() => {
    createIcons({ icons });
  }, []);

  return (
    <>
      {/* Heading Section */}
      <div className={styles.textCenter}>
        <h1 className={styles.title}>GET IN TOUCH</h1>
        <h2 className={styles.subtitle}>Contact</h2>
      </div>

      {/* Contact Info Grid */}
      <div className={styles.contactGrid}>
        <div className={styles.infoGrid}>
          <div className={`${styles.infoCard} ${styles.bgBlue100}`}>
            <h3 className={styles.cardHeading}>
              <i data-lucide="phone"></i>
              EMERGENCY
            </h3>
            <p>0926-638-6300</p>
          </div>

          <div className={`${styles.infoCard} ${styles.bgBlue600} ${styles.textWhite}`}>
            <h3 className={styles.cardHeading}>
              <i data-lucide="map-pin"></i>
              LOCATION
            </h3>
            <p>Bulihan, Plaridel, Malolos</p>
          </div>

          <div className={`${styles.infoCard} ${styles.bgBlue100}`}>
            <h3 className={styles.cardHeading}>
              <i data-lucide="mail"></i>
              EMAIL
            </h3>
            <p>primemedicallaboratory25@gmail.com</p>
          </div>

          <div className={`${styles.infoCard} ${styles.bgBlue600} ${styles.textWhite}`}>
            <h3 className={styles.cardHeading}>
              <i data-lucide="timer"></i>
              WORKING HOURS
            </h3>
            <p>Mon - Sun 07:00 - 17:00</p>
          </div>
        </div>
      </div>

      {/* Map Embed */}
      <div className={styles.mapContainer}>
        <iframe
          src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3856.3028139245425!2d120.80356777474479!3d14.864336485653867!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3396539fbcb72721%3A0x354c9a99ae71365c!2sPrime%20Medical%20Laboratory!5e0!3m2!1sen!2sph!4v1733939579397!5m2!1sen!2sph"
          width="100%"
          height="450"
          allowFullScreen=""
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          title="PrimeLab Location"
        ></iframe>
      </div>
    </>
  );
}
