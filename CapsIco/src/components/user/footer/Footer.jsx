import styles from './Footer.module.css';
import { Mail, Facebook, Instagram, Linkedin, MapPin, Phone, Clock } from 'lucide-react';

export function Footer() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerGrid}>
        {/* Brand & Tagline */}
        <div className={styles.brandSection}>
          <h3 className={styles.brand}>JREA</h3>
          <p className={styles.tagline}>Excellence and Trusted Care</p>
          <p className={styles.description}>
            Your partner in health and wellness. Providing quality medical services with compassion and expertise.
          </p>
        </div>

        {/* Quick Links */}
        <div className={styles.linksSection}>
          <h3 className={styles.sectionTitle}>Quick Links</h3>
          <ul className={styles.linkList}>
            <li><a href="/appointment" className={styles.link}>Book Appointment</a></li>
            <li><a href="/services" className={styles.link}>Our Services</a></li>
            <li><a href="/about" className={styles.link}>About Us</a></li>
            <li><a href="/contact" className={styles.link}>Contact</a></li>
          </ul>
        </div>

        {/* Contact & Social */}
        <div className={styles.contactSection}>
          <h3 className={styles.sectionTitle}>Connect With Us</h3>
          <ul className={styles.metaList}>
            <li>
              <MapPin size={16} />
              <span>Malolos, Bulacan</span>
            </li>
            <li>
              <Phone size={16} />
              <span>+63 912 345 6789</span>
            </li>
            <li>
              <Clock size={16} />
              <span>Mon-Sat 8AM-5PM</span>
            </li>
          </ul>
          <div className={styles.socialContainer}>
            <div className={styles.socialLinks}>
              <a href="https://www.linkedin.com/in/eloisa-jane-santos-ab6671287/" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn">
                <Linkedin size={16} />
              </a>
              <a href="https://www.facebook.com/PrimeMedicalLabMalolos" target="_blank" rel="noopener noreferrer" aria-label="Facebook">
                <Facebook size={16} />
              </a>
              <a href="https://www.instagram.com/loisajanee/" target="_blank" rel="noopener noreferrer" aria-label="Instagram">
                <Instagram size={16} />
              </a>
            </div>
          </div>
        </div>
      </div>

      <div className={styles.footerBottom}>
        <p>© {new Date().getFullYear()} JREA. All Rights Reserved.</p>
      </div>
    </footer>
  );
}
