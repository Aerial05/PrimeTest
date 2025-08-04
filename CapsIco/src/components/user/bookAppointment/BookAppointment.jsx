import React, { useState } from "react";
import styles from "./BookAppointment.module.css";

export function BookAppointment() {
  const [formData, setFormData] = useState({
    name: "",
    gender: "",
    birthday: "",
    service: "",
    date: "",
    time: "",
    message: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Appointment Submitted:", formData);
    // Later: send to Firebase or backend
  };

  return (
    <div className={styles.appointmentWrapper}>
      <form className={styles.bookingForm} onSubmit={handleSubmit}>
        <div className={styles.formGrid}>
          <div className={styles.formGroup}>
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              required
              value={formData.name}
              onChange={handleChange}
              className={styles.formInput}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="gender">Gender</label>
            <select
              id="gender"
              name="gender"
              required
              value={formData.gender}
              onChange={handleChange}
              className={styles.formInput}
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="birthday">Birthday</label>
            <input
              type="date"
              id="birthday"
              name="birthday"
              required
              value={formData.birthday}
              onChange={handleChange}
              className={styles.formInput}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="service">Service</label>
            <select
              id="service"
              name="service"
              required
              value={formData.service}
              onChange={handleChange}
              className={styles.formInput}
            >
              <option value="">Select service</option>
              <option value="general-checkup">General Check-up</option>
              <option value="blood-test">Blood Test</option>
              <option value="x-ray">X-Ray</option>
              <option value="ultrasound">Ultrasound</option>
              <option value="drug-test">Drug Test</option>
            </select>
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="date">Date</label>
            <input
              type="date"
              id="date"
              name="date"
              required
              value={formData.date}
              onChange={handleChange}
              className={styles.formInput}
            />
          </div>

          <div className={styles.formGroup}>
            <label htmlFor="time">Time</label>
            <input
              type="time"
              id="time"
              name="time"
              min="07:00"
              max="17:00"
              required
              value={formData.time}
              onChange={handleChange}
              className={styles.formInput}
            />
          </div>
        </div>

        <div className={`${styles.formGroup} ${styles.fullWidth}`}>
          <label htmlFor="message">Additional Message</label>
          <textarea
            id="message"
            name="message"
            rows="4"
            value={formData.message}
            onChange={handleChange}
            className={styles.formInput}
          ></textarea>
        </div>

        <button type="submit" className={styles.submitBtn}>
          BOOK APPOINTMENT
        </button>
      </form>

      <div className={styles.scheduleSection}>
        <h2 className={styles.scheduleTitle}>Schedule Hours</h2>
        <div className={styles.scheduleTable}>
          {["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"].map((day) => (
            <div key={day} className={styles.scheduleRow}>
              <span>{day}</span>
              <span>07:00 AM - 17:00 PM</span>
            </div>
          ))}
        </div>
        <div className={styles.emergencyContact}>
          <h3>Emergency</h3>
          <p>0926-638-6300</p>
        </div>
      </div>
    </div>
  );
}
