import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ServicesContent.module.css';

// Data compiled from the provided flyers/images (ASCII only to avoid encoding issues)
const packages = [
  {
    title: 'Comprehensive Diagnostic Package',
    desc:
      'Covers Hypertension, Diabetes, Kidney, Liver, Heart, Blood Disease and Urinary Tract System disease screening.',
    philhealthPrice: 'Promo: PHP 899',
    discountedPrice: 'Prev: PHP 2,599',
    originalPrice: 'PHP 3,185',
    badge: 'Free initial medical specialist consult',
    features: [
      'CBC',
      'Urinalysis',
      'Fasting Blood Sugar (FBS)',
      'HbA1c',
      'Creatinine',
      'Uric Acid',
      'SGPT',
      'ECG',
      'Lipid Profile (TC, TG, HDL, LDL, VLDL)',
      'Cardiac Risk Assessment',
      'Diabetes Risk Assessment',
      'Diabetic Foot Exam',
    ],
  },
  {
    title: 'Animal Bite Treatment Package',
    desc:
      'Evaluation and treatment of animal-bite cases by accredited staff. Includes assessment, wound care, vaccination planning and monitoring. Final management depends on exposure category and physician evaluation.',
    priceNote:
      'Prices may vary depending on vaccine/ERIG need, wound severity and PhilHealth coverage. Contact the clinic for an exact quote.',
    features: [
      'Rabies Vaccine',
      'Rabies Immune Globulin (ERIG)',
      'Local Wound Care',
      'Tetanus Toxoid and Anti-Tetanus Serum',
      'Antibiotics (if needed)',
    ],
  },
  { title: 'Pre-Employment Package A', desc: 'CBC, Urinalysis, Chest X-ray. With FREE Physical Exam and Medical Certificate (Fit to Work).', discountedPrice: 'Rate: PHP 599' },
  { title: 'Pre-Employment Package B', desc: 'CBC, Urinalysis, Chest X-ray, Drug Test. With FREE Physical Exam and Medical Certificate (Fit to Work).', discountedPrice: 'Rate: PHP 899' },
  { title: 'Pre-Employment Package C', desc: 'CBC, Urinalysis, Chest X-ray, Drug Test, Fecalysis. With FREE Physical Exam and Medical Certificate (Fit to Work).', discountedPrice: 'Rate: PHP 999' },
  { title: 'Pre-Employment Package D', desc: 'CBC, Urinalysis, Chest X-ray, Drug Test, Fecalysis, HBsAg. With FREE Physical Exam and Medical Certificate.', discountedPrice: 'Rate: PHP 1,199' },
  { title: 'Pre-Employment Package E', desc: 'CBC, Urinalysis, Chest X-ray, Drug Test, Fecalysis, Anti-HAV (IgM). With FREE Physical Exam and Medical Certificate.', discountedPrice: 'Rate: PHP 1,250' },
];

const services = [
  // Pinned: always appears on top
  {
    title: 'Free Anti-Rabies Vaccine',
    desc:
      'Free anti-rabies vaccination for eligible animal-bite patients during designated clinic days. Slots are limited and strictly first-come, first-served.',
    pinned: true,
    features: [
      'Available only on Monday, Wednesday, Thursday and Saturday',
      'Clinic hours 8:00 AM - 4:00 PM; last call 3:30 PM',
      'First-come, first-served; slots available for the first 30 patients',
      'If bitten on Sunday -> come Monday',
      'If bitten on Tuesday -> come Wednesday',
      'If bitten on Friday -> come Saturday',
      'For eligibility to avail the Libreng Anti-Rabies Package',
    ],
    priceNote:
      'No charge for the vaccine on the stated days for qualified patients; other medicines or procedures may have separate costs depending on the case.',
  },
  {
    title: 'Complete Laboratory',
    desc:
      'Full range of chemistry, hematology and urinalysis tests for screening, monitoring and diagnosis. Includes fasting requirement guidance and result interpretation by physicians.',
    priceNote:
      "Prices vary by test panel and doctor's request. Bundled rates available for multiple tests.",
  },
  {
    title: 'X-ray / Ultrasound',
    desc:
      'General radiography and ultrasound imaging (upper abdomen, pelvic, breast) performed by licensed staff with physician over-read.',
    priceNote:
      'Price depends on the specific view/area and whether contrast or additional plates are needed.',
  },
  { title: '12-Lead ECG', desc: 'Heart rhythm analysis.', discountedPrice: 'PHP 250' },
  { title: 'Drug Testing', desc: 'Standard screening.', discountedPrice: 'PHP 280' },
  {
    title: 'Animal Bite Center',
    desc:
      'Walk-in assessment for animal bites and scratches. Exposure categorization, wound care, and advice on vaccine/ERIG administration following DOH guidelines.',
    priceNote:
      'Total cost depends on vaccine doses, ERIG requirement, and follow-up schedule.',
  },
  { title: 'Pap Smear', desc: 'Cervical cancer screening performed by trained providers with proper collection and result counseling.', priceNote: 'Pricing varies by lab method and whether additional HPV testing is requested.' },
  { title: 'Circumcision', desc: 'Surgical circumcision, all-in package.', discountedPrice: 'PHP 2,400' },
  { title: 'Vaccination', desc: 'Routine and catch-up immunizations for children and adults; includes pre-screening and post-vaccination instructions.', priceNote: 'Cost depends on vaccine brand, age group and dose number.' },
  { title: 'Neuro Psychological Test', desc: 'Psychometric testing for employment or clearance.', discountedPrice: 'PHP 1,150' },
  { title: 'Annual Medical Examination', desc: 'Comprehensive employee or individual medical exam with required tests and medical certificate. Packages can be tailored to company policies.', priceNote: 'Rates depend on requested tests and company requirements.' },
  { title: 'Home Service Laboratory & Checkup', desc: 'Home specimen collection and basic checkups for patients who prefer or require at-home service. Results delivered digitally or via pick-up.', priceNote: 'Home service fees vary by location and test type.' },
  { title: 'Medical Certificate', desc: 'Issuance of medical certificates for work, school or travel after appropriate evaluation by a physician.', priceNote: 'Cost varies by purpose and whether additional tests are needed.' },
  { title: 'Rapid Antigen Test', desc: 'SARS-CoV-2 antigen testing for screening and travel requirements with quick turnaround time.', priceNote: 'Price may vary by kit brand and documentation needs.' },
  { title: 'Multispecialty Clinic', desc: 'Consultations with specialists (Family Medicine, Internal Medicine, Pediatrics, Pulmonology, Cardiology, Gastroenterology, OB-Gyne, Pain and Occupational Health).', priceNote: 'Professional fees vary by specialty and case complexity.' },
  { title: 'HMO / Healthcards', desc: 'Processing and acceptance of selected HMOs/healthcards for covered tests and consults subject to plan rules.', priceNote: 'Member share depends on HMO coverage and approvals.' },
  {
    title: 'Animal Bite PhilHealth Konsulta Assistance',
    desc:
      'Assistance of PhilHealth Konsulta for Animal Bite Treatment Package (for Seniors, Members and Beneficiaries of PhilHealth).',
    philhealthPrice: 'PHP 5,850 Assistance',
    features: [
      'Rabies Vaccine',
      'Rabies Immune Globulin (ERIG)',
      'Local Wound Care',
      'Tetanus Toxoid and Anti-Tetanus Serum',
      'Antibiotics (if needed)',
    ],
  },
  {
    title: 'PhilHealth Konsulta (Assistance)',
    desc:
      'Assistance worth PHP 1,700 each (Member, Dependent, Senior). Dependent on physician request; selected labs and procedures covered.',
    philhealthPrice: 'Assistance: PHP 1,700',
    features: [
      '13 Laboratory tests including blood chemistry',
      'CBC with Platelet count',
      'Lipid Profile',
      'Fasting Blood Sugar (FBS)',
      'Oral Glucose Tolerance Test (OGTT)',
      'Glycosylated Hemoglobin (HbA1c)',
      'Creatinine',
      'Urinalysis / Fecalysis / Fecal Occult Blood Test',
      'Chest X-ray',
      '12-lead ECG',
      'Ultrasound (Upper Abdomen, Pelvic, Breast)',
      'Pap Smear',
      'Selected medicines (21 items)'
    ],
  },
];

export default function ServicesContent() {
  const [activeTab, setActiveTab] = useState('all');
  const [query, setQuery] = useState('');
  const navigate = useNavigate();

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
    if (activeTab === 'packages') arr = packages;
    else if (activeTab === 'services') arr = services;
    else arr = [...packages, ...services];
    // Ensure pinned items (e.g., Free Anti-Rabies Vaccine) are always on top
    return [...arr].sort((a, b) => (b && b.pinned ? 1 : 0) - (a && a.pinned ? 1 : 0));
  }, [activeTab]);

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
                  >
                    Book Appointment
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
                      {item.philhealthPrice && (
                        <span className={styles.philhealth}>PhilHealth/Promo: <b>{item.philhealthPrice}</b></span>
                      )}
                      {item.discountedPrice && (
                        <span className={styles.discounted}>Rate/Discounted: <b>{item.discountedPrice}</b></span>
                      )}
                      {item.originalPrice && (
                        <span className={styles.original}>Original: <s>{item.originalPrice}</s></span>
                      )}
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

