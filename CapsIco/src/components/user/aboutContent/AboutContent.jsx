import styles from './AboutContent.module.css';

export function AboutContent() {
  return (
    <section className={styles.aboutSection}>
      <div className={styles.container}>
        <h1 className={styles.title}>About Prime Medical Laboratory</h1>
        <div className={styles.grid}>
          <div className={styles.textColumn}>
            <p className={styles.paragraph}>
              Prime Medical Laboratory is a community-first diagnostics clinic in Malolos, Bulacan. We focus on precise, timely, and cost‑friendly care so patients can make informed health decisions with confidence.
            </p>
            <p className={styles.paragraph}>
              We are among the first private diagnostic clinics accredited for PhilHealth Konsulta and Animal Bite Treatment assistance. Patients may receive support for select laboratory tests and consultations as assessed by a physician.
            </p>
            <p className={styles.paragraph}>
              Clinic hours: Mon–Sat 7:00 AM – 4:00 PM (cutoff 3:30 PM); Sun 7:30 AM – 11:30 AM.
            </p>
          </div>

          <div className={styles.card}>
            <h2 className={styles.subheading}>PhilHealth Assistance</h2>
            <p className={styles.paragraph}>
              PhilHealth Konsulta: assistance available for Members, Dependents, and Seniors (subject to doctor’s request and PhilHealth rules).
            </p>
            <h2 className={styles.subheading}>Animal Bite Care</h2>
            <p className={styles.paragraph}>
              Free Anti‑Rabies Vaccine on Mon, Wed, Thu, and Sat (8:00 AM – 4:00 PM, last call 3:30 PM), first‑come, first‑served for the first 30 patients and based on eligibility.
            </p>
            <h2 className={styles.subheading}>Core Services</h2>
            <p className={styles.paragraph}>
              Complete Laboratory • X‑ray • Ultrasound • 12‑Lead ECG • Drug Testing • Animal Bite Center • Pap Smear • Vaccination • Pre‑Employment Packages • Annual Medical Exam • Home Service Laboratory & Checkup • Medical Certificates • Rapid Antigen Test • Multispecialty Clinic • HMO/Healthcards
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
