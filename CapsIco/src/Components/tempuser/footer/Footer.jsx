import styles from './Footer.module.css';
import { Mail, Facebook, Instagram, Linkedin } from 'lucide-react';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerGrid}>
        <div>
          <h3 className={styles.brand}>PRIMELAB</h3>
          <p>PrimeLab Appoint:</p>
          <p>Excellence and Trusted Care</p>
        </div>

        <div>
          <h3 className={styles.sectionTitle}>Important Links</h3>
          <ul className={styles.linkList}>
            <li><a href="/appointment" className={styles.link}>Appointment</a></li>
            <li><a href="/services" className={styles.link}>Services</a></li>
            <li><a href="/about" className={styles.link}>About Us</a></li>
          </ul>
        </div>

        <div>
          <h3 className={styles.sectionTitle}>Newsletter</h3>
          <form>
            <div className={styles.newsletterForm}>
              <input
                type="email"
                placeholder="Enter your email"
                className={styles.input}
              />
              <button type="submit" className={styles.button}>
                <Mail size={18} />
              </button>
            </div>
          </form>
          <p className={styles.note}>For news and offers</p>

          <div className={styles.socialContainer}>
            <h4>Third-party accounts</h4>
            <div className={styles.socialLinks}>
              <a href="https://www.linkedin.com/in/eloisa-jane-santos-ab6671287/" target="_blank" aria-label="LinkedIn"><Linkedin /></a>
              <a href="https://www.facebook.com/PrimeMedicalLabMalolos" target="_blank" aria-label="Facebook"><Facebook /></a>
              <a href="https://www.instagram.com/loisajanee/" target="_blank" aria-label="Instagram"><Instagram /></a>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.footerBottom}>
        <p>© 2021 PrimeLab All Rights Reserved</p>
      </div>
    </footer>
  );
}
