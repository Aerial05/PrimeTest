import React, { useEffect, useState } from 'react';
import styles from './Hero.module.css';
import { onValue, ref } from 'firebase/database';
import { usersDB } from '../../../../config/firebase-config';

const TABS = [
  { name: 'PRIME MEDICAL LABORATORY', src: 'https://momento360.com/e/u/4614a6341be84cb4808f9634ca46f65e?utm_campaign=embed&utm_source=other&heading=0&pitch=0&field-of-view=75&size=medium&display-plan=true' },
  { name: 'RECEIVING AREA', src: 'https://momento360.com/e/u/63c362683d574f4588023d8cc52e44bd?utm_campaign=embed&utm_source=other&heading=0&pitch=0&field-of-view=75&size=medium&display-plan=true' },
  { name: 'DR. JOY CHECKUP', src: 'https://momento360.com/e/u/24a2d6cb487f49e2b0bbebd6237f8c91?utm_campaign=embed&utm_source=other&heading=0&pitch=0&field-of-view=75&size=medium&autoplay-annotations=true&display-plan=true' },
  { name: 'ULTRASOUND ROOM', src: 'https://momento360.com/e/u/c33dc449e344402bb4555f6a908b2ca2?utm_campaign=embed&utm_source=other&heading=0&pitch=0&field-of-view=75&size=medium&display-plan=true' },
  { name: 'X‑RAY WORKROOM', src: 'https://momento360.com/e/u/fdeffb07ef184fa4a27f8e845cea301c?utm_campaign=embed&utm_source=other&heading=128&pitch=0.25&field-of-view=75&size=medium&display-plan=true '},
  { name: 'X‑RAY ROOM', src: 'https://momento360.com/e/u/3e379cea55cf45cabefdd5ee79ef7348?utm_campaign=embed&utm_source=other&heading=0&pitch=0&field-of-view=75&size=medium&display-plan=true' },
  { name: 'ECG ROOM', src: 'https://momento360.com/e/u/2c1f712f62414ecaa4a1d634e3e2bcff?utm_campaign=embed&utm_source=other&heading=0&pitch=0&field-of-view=75&size=medium&display-plan=true' },
  { name: 'OB‑GYNE ROOM', src: 'https://momento360.com/e/u/cb63f1673a38414a8497e73496085e5f?utm_campaign=embed&utm_source=other&heading=0&pitch=0&field-of-view=75&size=medium&display-plan=true' },
  { name: 'LABORATORY', src: 'https://momento360.com/e/u/2692612ce8e24f96b4f35576d8c04e19?utm_campaign=embed&utm_source=other&heading=0&pitch=0&field-of-view=75&size=medium&display-plan=true' },
];

const TAB_INFO = [
  {
    label: "WELCOME TO PRIME MEDICAL LABORATORY",
    heading: "Your Gateway to Exceptional Healthcare",
    desc: "Step into our modern front entrance and experience a warm welcome. Our staff is ready to assist you with every need from the moment you arrive. The reception is designed to be both inviting and efficient, ensuring that you feel comfortable right away. From here, we guide you smoothly to the next step of your healthcare journey.",
  },
  {
    label: "RECEIVING AREA",
    heading: "Efficient Patient Reception",
    desc: "Our receiving area ensures a smooth check-in process. Friendly staff and a comfortable environment set the tone for your visit. We value your time and strive to minimize waiting, while keeping the space calm and welcoming. This area reflects our commitment to patient-centered care from the very beginning.",
  },
  {
    label: "DR. JOY CHECKUP",
    heading: "Personalized Medical Consultations",
    desc: "Meet Dr. Joy in a private, well-equipped room designed for thorough check-ups and patient comfort. The room is tailored to provide a quiet and professional space for confidential consultations. Here, patients receive personalized attention and expert medical advice. Every detail is arranged to make you feel at ease during your visit.",
  },
  {
    label: "ULTRASOUND ROOM",
    heading: "Advanced Imaging Technology",
    desc: "Explore our Ultra Sound Room with a 360° Virtual Tour. Discover how we use cutting-edge equipment for precise diagnostics. The room is carefully arranged for patient comfort during procedures, ensuring a stress-free experience. Our specialists use these tools to provide clear insights that support accurate medical decisions.",
  },
  {
    label: "X‑RAY WORKROOM",
    heading: "Professional X-ray Services",
    desc: "Our Work Room Xray is equipped for quick and accurate imaging, supporting your healthcare journey. The space is designed for efficiency, helping both patients and staff move smoothly through the process. Every procedure is handled with care and precision, ensuring the highest safety standards. This room serves as a vital step in diagnostic support.",
  },
  {
    label: "X‑RAY ROOM",
    heading: "Comprehensive Radiology",
    desc: "Step into our Xray Room for safe and reliable radiology services, handled by experienced technicians. The room features advanced imaging systems designed to capture detailed results. We prioritize both accuracy and patient safety during each procedure. This ensures that doctors receive the information they need for effective treatment planning.",
  },
  {
    label: "ECG ROOM",
    heading: "Heart Health Monitoring",
    desc: "Our ECG Room provides advanced cardiac monitoring to ensure your heart’s well-being. Patients are guided through the process by skilled staff who prioritize comfort and clarity. The equipment delivers precise readings that help doctors evaluate heart activity effectively. With a focus on accuracy, the ECG room plays a vital role in preventive and diagnostic care.",
  },
  {
    label: "OB‑GYNE ROOM",
    heading: "Women’s Care and Wellness",
    desc: "Our OB‑Gyne Room is set up for comfortable, private consultations focused on women’s health. From prenatal care to routine gynecologic evaluations, our specialists provide attentive, compassionate service in a professional setting.",
  },
  {
    label: "LABORATORY",
    heading: "Precision Lab Testing",
    desc: "Visit our Laboratory Room for accurate and timely test results, powered by state-of-the-art technology. Our team of professionals ensures that every sample is handled with precision and care. The lab is designed for efficiency, supporting both routine and specialized testing. Reliable results from this room help guide doctors in making informed medical decisions.",
  },
];


export function Hero() {
  const [activeTab, setActiveTab] = useState(0); // Default to first tab
  const [name, setName] = useState();
useEffect(() => {
    onValue(ref(usersDB, '/name'), (snapshot) => {
      if(snapshot.exists()){
        setName(snapshot.val());
      }
    })
  }, []);
  return (
    
    <section className={styles.heroSection}>
      <div className={styles.container}>
        <h1>{name}</h1>
        {/* Tabs on Top Right */}
        <div className={styles.tabsWrapper}>
          <div className={styles.tabsContainer}>
            {TABS.map((tab, idx) => (
              <button
                key={tab.name}
                className={`${styles.tabButton} ${styles['tabIcon' + idx]} ${activeTab === idx ? styles.activeTab : ''}`}
                onClick={() => setActiveTab(idx)}
              >
                {tab.name}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.heroContent}>
          {/* Left Text */}
          <div className={styles.textBlock}>
            <div className={styles.label}>{TAB_INFO[activeTab].label}</div>
            <h1 className={styles.heading}>
              {TAB_INFO[activeTab].heading}
            </h1>
            <p className={styles.subText}>
              {TAB_INFO[activeTab].desc}
            </p>
            <a href="/services">
              <button className={styles.button}>Our Services</button>
            </a>
          </div>
          {/* Right Image Embed */}
          <div className={styles.embed}>
            <iframe
              width="800"
              height="400"
              frameBorder="0"
              src={TABS[activeTab].src}
              allowFullScreen
              title={TABS[activeTab].name}
            ></iframe>
          </div>
        </div>
      </div>
    </section>
  );
}
