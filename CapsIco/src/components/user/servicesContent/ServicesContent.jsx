import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ServicesContent.module.css';
import servicePackagesService from '/src/services/ServicePackagesService';
import singleServicesService from '/src/services/SingleServicesService';

// Load from Firebase instead of static arrays
// We keep the same UI shape: { title, desc, features[], priceNote, philhealthPrice, discountedPrice, originalPrice, pinned? }

export default function ServicesContent() {
  const [activeTab, setActiveTab] = useState('all');
  const [query, setQuery] = useState('');
  const [pkgItems, setPkgItems] = useState([]);
  const [svcItems, setSvcItems] = useState([]);
  const navigate = useNavigate();

  // Map helpers
  const peso = (n) => {
    if (n === undefined || n === null || n === '' || Number.isNaN(Number(n))) return '';
    return `PHP ${Number(n).toLocaleString()}`;
  };
  const parseFeatures = (v) => {
    if (!v) return [];
    if (Array.isArray(v)) return v;
    const s = String(v);
    if (s.includes('\n')) return s.split('\n').map((x) => x.trim()).filter(Boolean);
    return s.split(',').map((x) => x.trim()).filter(Boolean);
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [bundles, singles] = await Promise.all([
          servicePackagesService.list(),
          singleServicesService.list(),
        ]);
        if (cancelled) return;
        // Filter out inactive items first
        const activeBundles = (bundles || []).filter((db) => String(db.IS_ACTIVE_YesNo || 'Yes').toLowerCase() !== 'no');
        const activeSingles = (singles || []).filter((db) => String(db.IS_ACTIVE_YesNo || 'Yes').toLowerCase() !== 'no');

        // Map packages
        const mappedPkgs = (activeBundles || []).map((db) => {
          const title = db.NAME || '';
          const desc = db.DESC || '';
          const priceNote = db.PRICE_NOTE || db['PRICE_NOTE (If no price)'] || '';
          const original = db.ORIGINAL_PRICE ?? db.ORIGINAL_RPICE;
          const discounted = db.DISCOUNTED_PRICE;
          const phil = db.PHIL_HEALTH_PROMO_PRICE;
          const features = parseFeatures(db.FEATURES);
          return {
            title,
            desc,
            features,
            priceNote,
            philhealthPrice: phil !== undefined ? peso(phil) : undefined,
            discountedPrice: discounted !== undefined ? peso(discounted) : undefined,
            originalPrice: original !== undefined ? peso(original) : undefined,
            bookingEnabled: String(db.BOOKING_ENABLED_YesNo || 'Yes').toLowerCase() !== 'no',
            // Show a helpful badge when available
            badge: db.BOOKING_ENABLED_YesNo === 'No' ? 'Booking not available' : undefined,
          };
        });

        // Map single services
        const mappedSvcs = (activeSingles || []).map((db) => {
          const title = db.NAME || '';
          const desc = db.DESC || '';
          const priceNote = db.PRICE_NOTE || db['PRICE NOTE'] || db['PRICE_NOTE (If no price)'] || '';
          const original = db.ORIGINAL_PRICE ?? db['ORIGINAL PRICE'];
          const discounted = db.DISCOUNTED_PRICE ?? db['DISCOUNTED PRICE'] ?? db.DICOUNTED_PRICE ?? db['DICOUNTED PRICE'];
          const phil = db.PHIL_HEALTH_PROMO_PRICE ?? db.PHILHEALTH_PROMO_PRICE ?? db['PHILHEALTH PROMO PRICE'];
          const features = parseFeatures(db.SPECIAL_INSTRUCTIONS);
          return {
            title,
            desc,
            features,
            priceNote,
            philhealthPrice: phil !== undefined ? peso(phil) : undefined,
            discountedPrice: discounted !== undefined ? peso(discounted) : undefined,
            originalPrice: original !== undefined ? peso(original) : undefined,
            bookingEnabled: true,
          };
        });

        // Optional: pin particular items by title contains
        const pin = (arr, predicate) => arr.map((x) => (predicate(x) ? { ...x, pinned: true } : x));
        const pinnedSvcs = pin(mappedSvcs, (x) => /free anti-rabies|anti-rabies|animal bite/i.test(x.title));

        setPkgItems(mappedPkgs);
        setSvcItems(pinnedSvcs);
      } catch (_) {
        // If DB fails, keep arrays empty; UI shows "no results" or rely on search
      }
    })();
    return () => { cancelled = true; };
  }, []);

  // Provider and schedule mapping
  const infoFor = (title = '') => {
    const t = (title || '').toLowerCase();
    const lines = [];
    // Combined X-ray/Ultrasound card
    if (t.includes('x-ray') && t.includes('ultrasound')) {
      lines.push('X-ray • Provider: Mr. Batoon — Everyday 9:00 AM – 4:00 PM');
      lines.push('Ultrasound • Provider: Dra. Cecile — Mon/Wed/Fri 2:00 PM – 5:00 PM');
      return { provider: 'Mr. Batoon / Dra. Cecile', availability: lines };
    }
    if (t.includes('x-ray') || t.includes('xray')) {
      lines.push('Provider: Mr. Batoon — Everyday 9:00 AM – 4:00 PM');
      return { provider: 'Mr. Batoon', availability: lines };
    }
    if (t.includes('ultrasound')) {
      lines.push('Provider: Dra. Cecile — Mon/Wed/Fri 2:00 PM – 5:00 PM');
      return { provider: 'Dra. Cecile', availability: lines };
    }
    if (t.includes('ob-gyne') || t.includes('obgyne') || (t.includes('ob') && t.includes('gyne'))) {
      lines.push('Provider: OB‑Gyne Specialist — Tue/Thu/Sat 2:00 PM – 5:00 PM');
      return { provider: 'OB‑Gyne Specialist', availability: lines };
    }
    if (t.includes('surgeon') || t.includes('surgery')) {
      lines.push('Provider: Dr. forgor — Per Appointment Only');
      return { provider: 'Dr. forgor', availability: lines };
    }
    if (t.includes('consult')) {
      lines.push('Provider: Pediatrician & Internal Medicine (Dra. Joy) — Daily 9:00 AM – 6:00 PM');
      return { provider: 'Pediatrician & Internal Medicine (Dra. Joy)', availability: lines };
    }
    if (t.includes('laboratory') || t.includes('package') || t.includes('pre-employment') || t.includes('comprehensive')) {
      lines.push('Provider: Prime Medical Laboratory');
      lines.push('Mon–Sat 7:00 AM – 4:00 PM (Cutoff 3:30 PM)');
      lines.push('Sun 7:30 AM – 11:30 AM');
      return { provider: 'Prime Medical Laboratory', availability: lines };
    }
    return { provider: 'Prime Medical Laboratory', availability: [] };
  };

  const items = useMemo(() => {
    let arr;
    if (activeTab === 'packages') arr = pkgItems;
    else if (activeTab === 'services') arr = svcItems;
    else arr = [...pkgItems, ...svcItems];
    return [...arr].sort((a, b) => (b && b.pinned ? 1 : 0) - (a && a.pinned ? 1 : 0));
  }, [activeTab, pkgItems, svcItems]);

  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    const match = (text) => (text || '').toString().toLowerCase().includes(q);
    return [...items]
      .filter((item) => {
        if (match(item.title) || match(item.desc) || match(item.badge) || match(item.priceNote)) return true;
        if (Array.isArray(item.features) && item.features.some((f) => match(f))) return true;
        if (match(item.philhealthPrice) || match(item.discountedPrice) || match(item.originalPrice)) return true;
        return false;
      })
      .sort((a, b) => (b && b.pinned ? 1 : 0) - (a && a.pinned ? 1 : 0));
  }, [items, query]);

  return (
    <section className={styles.servicesSection}>
      <div className={styles.container}>
        <h2 className={styles.title}>Our Services & Packages</h2>
        <div className={styles.controlsBar}>
          <div className={styles.tabs}>
            <button
              className={`${styles.tabBtn} ${activeTab === 'all' ? styles.active : ''}`}
              onClick={() => setActiveTab('all')}
            >
              All
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'packages' ? styles.active : ''}`}
              onClick={() => setActiveTab('packages')}
            >
              Packages
            </button>
            <button
              className={`${styles.tabBtn} ${activeTab === 'services' ? styles.active : ''}`}
              onClick={() => setActiveTab('services')}
            >
              Services
            </button>
          </div>
          <div className={styles.searchWrap}>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search services or packages..."
              className={styles.searchInput}
              aria-label="Search services"
            />
          </div>
        </div>
        <div className={styles.verticalGrid}>
          {filteredItems.length === 0 && (
            <div className={styles.noResults}>No matching services found.</div>
          )}
          {filteredItems.map((item, idx) => (
            <div key={idx} className={styles.card}>
              <div className={styles.cardRow}>
                {item.title.includes('X-ray / Ultrasound') ? (
                  <div style={{display:'flex', gap:'.5rem', marginLeft:'auto'}}>
                    <button className={styles.appointmentBtn} onClick={() => navigate('/appointment', { state: { selectedItem: { title: 'X-ray' } } })}>Book X-ray</button>
                    <button className={styles.appointmentBtn} onClick={() => navigate('/appointment', { state: { selectedItem: { title: 'Ultrasound' } } })}>Book Ultrasound</button>
                  </div>
                ) : (
                  <button
                    className={styles.appointmentBtn}
                    onClick={() => navigate('/appointment', { state: { selectedItem: item } })}
                    disabled={item.bookingEnabled === false}
                    title={item.bookingEnabled === false ? 'Booking disabled for this service' : 'Proceed to booking'}
                    aria-disabled={item.bookingEnabled === false}
                    style={item.bookingEnabled === false ? { opacity: 0.6, cursor: 'not-allowed' } : undefined}
                  >
                    {item.bookingEnabled === false ? 'Booking Disabled' : 'Book Appointment'}
                  </button>
                )}
                <div className={styles.cardContent}>
                  <h3 className={styles.subheading}>{item.title}</h3>
                  {(() => { const info = infoFor(item.title); return (
                    <div className={styles.meta}>
                      <div className={styles.metaRow}><strong>Provider:</strong> {info.provider}</div>
                      {info.availability && info.availability.length > 0 && (
                        <div className={styles.metaAvail}>
                          {info.availability.map((ln, i) => (<div key={i}>{ln}</div>))}
                        </div>
                      )}
                    </div>
                  ); })()}
                  {item.badge && (
                    <p className={styles.paragraph}><b>{item.badge}</b></p>
                  )}
                  <p className={styles.paragraph}>{item.desc}</p>
                  {Array.isArray(item.features) && item.features.length > 0 && (
                    <ul className={styles.paragraph}>
                      {item.features.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  )}
                  {item.availability && (
                    <p className={styles.paragraph}>{item.availability}</p>
                  )}
                  {(item.philhealthPrice || item.discountedPrice || item.originalPrice) ? (
                    <div className={styles.priceGroup}>
                      {/* Build ordered list (discounted, philhealth, original) and remove duplicates */}
                      {(() => {
                        const ordered = [item.discountedPrice, item.philhealthPrice, item.originalPrice];
                        const seen = new Set();
                        const rows = [];
                        for (const val of ordered) {
                          if (!val) continue;
                          if (seen.has(val)) continue;
                          seen.add(val);
                          rows.push(val);
                          if (rows.length >= 3) break;
                        }
                        return rows.map((val, i) => {
                          if (val === item.discountedPrice) return (<span key={i} className={styles.discounted}>Rate/Discounted: <b>{val}</b></span>);
                          if (val === item.philhealthPrice) return (<span key={i} className={styles.philhealth}>PhilHealth/Promo: <b>{val}</b></span>);
                          return (<span key={i} className={styles.original}>Original: {val}</span>);
                        });
                      })()}
                    </div>
                  ) : (
                    <p className={styles.priceNote}>
                      {item.priceNote || 'Prices may vary depending on the case, physician request, and coverage. Please contact the clinic to confirm your total cost.'}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

