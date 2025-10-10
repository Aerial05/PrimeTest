import styles from './HeaderInfoBar.module.css';
import { Activity, Phone, Clock, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import React, { useEffect, useRef } from 'react';

export function HeaderInfoBar() {
  // Keep a live CSS variable of the header's actual height so the sticky nav can offset correctly
  const headerRef = useRef(null);
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const setVar = () => {
      const h = el.getBoundingClientRect().height;
      document.documentElement.style.setProperty('--header-info-height', `${Math.ceil(h)}px`);
    };
    setVar();
    const ro = new ResizeObserver(setVar);
    ro.observe(el);
    window.addEventListener('resize', setVar);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', setVar);
    };
  }, []);

  return (
    <header className={styles.siteHeader} ref={headerRef}>
      <div className={styles.container}>
        <div className={styles.headerContent}>
          <Link to="/" className={styles.logoLink}>
            <Activity className={styles.logoIcon} />
            <span className={styles.brandName}>Prime Medical Laboratory</span>
          </Link>

          <div className={styles.contactInfo}>
            <div className={styles.infoItem}>
              <Phone className={styles.infoIcon} />
              <div className={styles.infoText}>
                <span className={styles.infoLabel}>EMERGENCY</span>
                <span className={styles.infoValue}>0926-638-6300</span>
              </div>
            </div>

            <div className={styles.infoItem}>
              <Clock className={styles.infoIcon} />
              <div className={styles.infoText}>
                <span className={styles.infoLabel}>WORK HOUR</span>
                <span className={styles.infoValue}>07:00 AM - 4:00 PM Monday to Saturday. 
                 
                  7:30AM – 11:30 AM Sunday
                </span>
              </div>
            </div>

            <div className={styles.infoItem}>
              <MapPin className={styles.infoIcon} />
              <div className={styles.infoText}>
                <span className={styles.infoLabel}>LOCATION</span>
                <Link to="/contact" className={styles.infoValue}>Bulihan, Malolos, Bulacan</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
