import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './ServicesContent.module.css';

const bundles = [
  { title: "Basic Health Bundle", desc: "CBC, Urinalysis, Fasting Blood Sugar, Lipid Profile, Physical Exam.", philhealthPrice: "₱900", discountedPrice: "₱1,100", originalPrice: "₱1,200" },
  { title: "Executive Checkup", desc: "CBC, Chest X-ray, ECG, FBS, Lipid Profile, Liver & Kidney Function Tests.", philhealthPrice: "₱2,000", discountedPrice: "₱2,300", originalPrice: "₱2,500" },
  { title: "Women's Wellness", desc: "CBC, Pap Smear, Breast Ultrasound, Urinalysis, FBS.", philhealthPrice: "₱1,400", discountedPrice: "₱1,600", originalPrice: "₱1,800" },
  { title: "Senior Care Package", desc: "CBC, ECG, FBS, Creatinine, Lipid Profile, Chest X-ray.", philhealthPrice: "₱1,600", discountedPrice: "₱1,800", originalPrice: "₱2,000" },
  { title: "Pre-Employment Bundle", desc: "CBC, Urinalysis, Drug Test, Chest X-ray, Physical Exam.", philhealthPrice: "₱800", discountedPrice: "₱900", originalPrice: "₱1,000" },
];

const singles = [
  { title: "CBC", desc: "Complete Blood Count for general health assessment.", philhealthPrice: "₱150", discountedPrice: "₱200", originalPrice: "₱250" },
  { title: "Urinalysis", desc: "Checks for urinary tract infections and kidney health.", philhealthPrice: "₱120", discountedPrice: "₱170", originalPrice: "₱200" },
  { title: "Fasting Blood Sugar", desc: "Measures blood glucose levels after fasting.", philhealthPrice: "₱180", discountedPrice: "₱250", originalPrice: "₱300" },
  { title: "Chest X-ray", desc: "Imaging for lungs and heart conditions.", philhealthPrice: "₱350", discountedPrice: "₱450", originalPrice: "₱500" },
  { title: "ECG", desc: "Electrocardiogram for heart rhythm analysis.", philhealthPrice: "₱300", discountedPrice: "₱350", originalPrice: "₱400" },
  { 
    title: "Surgeon (Dr. Forgor)", 
    desc: "Consultation and procedures by Dr. Forgor. Per Appointment Only.", 
    philhealthPrice: "₱500", 
    discountedPrice: "₱700", 
    originalPrice: "₱900" 
  },
  { 
    title: "X-ray (Mr. Batoon)", 
    desc: "X-ray services by Mr. Batoon. Available Everyday 9:00 AM to 4:00 PM.", 
    philhealthPrice: "₱350", 
    discountedPrice: "₱400", 
    originalPrice: "₱500" 
  },
  { 
    title: "Ibogaine (Dra. Aklan)", 
    desc: "Ibogaine therapy by Dra. Aklan. Tues, Thurs, Sat: 2:00 PM to 5:00 PM.", 
    philhealthPrice: "₱800", 
    discountedPrice: "₱1,000", 
    originalPrice: "₱1,200" 
  },
  { 
    title: "Ultra Sound (Dra. Cecile)", 
    desc: "Ultrasound by Dra. Cecile. Mon, Wed, Fri: 2:00 PM to 5:00 PM.", 
    philhealthPrice: "₱600", 
    discountedPrice: "₱800", 
    originalPrice: "₱1,000" 
  },
  { 
    title: "Consultation (Pediatrician & Internal Medicine, Dra. Joy)", 
    desc: "Consultation with Dra. Joy (Pediatrician & Internal Medicine). 9:00 AM to 6:00 PM.", 
    philhealthPrice: "₱400", 
    discountedPrice: "₱600", 
    originalPrice: "₱800" 
  },
];

export default function ServicesContent() {
  const [activeTab, setActiveTab] = useState('bundles');
  const navigate = useNavigate();

  return (
    <section className={styles.servicesSection}>
      <div className={styles.container}>
        <h2 className={styles.title}>Our Laboratory Services</h2>
        <div className={styles.tabs}>
          <button
            className={`${styles.tabBtn} ${activeTab === 'bundles' ? styles.active : ''}`}
            onClick={() => setActiveTab('bundles')}
          >
            Bundles
          </button>
          <button
            className={`${styles.tabBtn} ${activeTab === 'singles' ? styles.active : ''}`}
            onClick={() => setActiveTab('singles')}
          >
            Single Services
          </button>
        </div>
        <div className={styles.verticalGrid}>
          {(activeTab === 'bundles' ? bundles : singles).map((item, idx) => (
            <div key={idx} className={styles.card}>
              <div className={styles.cardRow}>
                <button
                  className={styles.appointmentBtn}
                  onClick={() => navigate('/appointment')}
                >
                  Appointment Page
                  {/* Make Object Method to get the Bundles/Single Service's Info and Price THen automaticaly 
                  Insert it to the service they want to Use once "Appointment Button is Clicked"*/}
                </button>
                <div className={styles.cardContent}>
                  <h3 className={styles.subheading}>{item.title}</h3>
                  <p className={styles.paragraph}>{item.desc}</p>
                  <div className={styles.priceGroup}>
                    <span className={styles.philhealth}>Philhealth Price: <b>{item.philhealthPrice}</b></span>
                    <span className={styles.discounted}>Discounted Price: <b>{item.discountedPrice}</b></span>
                    <span className={styles.original}>Original Price: <s>{item.originalPrice}</s></span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}