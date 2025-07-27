// pages/book-appointment.js
import React, { useState, useEffect } from 'react';
import styles from './BookAppointment.module.css'; // Adjust the path as necessary

export function BookAppointment() {
    const [formData, setFormData] = useState({
        name: '',
        gender: '',
        birthday: '',
        service: '',
        date: '',
        time: '',
        message: ''
    });

    const [successMessage, setSuccessMessage] = useState('');
    const [errorMessage, setErrorMessage] = useState('');

    useEffect(() => {
        // Check if there are status and message in the URL
        const urlParams = new URLSearchParams(window.location.search);
        const status = urlParams.get('status');
        const message = urlParams.get('message');

        if (status && message) {
            alert(message);
        }
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData({
            ...formData,
            [name]: value
        });
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        // Here you can handle form submission logic
        // For now, we will just display a success message
        setSuccessMessage('Appointment booked successfully!');
        setErrorMessage('');
        // Reset form
        setFormData({
            name: '',
            gender: '',
            birthday: '',
            service: '',
            date: '',
            time: '',
            message: ''
        });
    };

    return (
        <div className={styles.container}>
            <header className={styles.siteHeader}>
                <div className={styles.headerContent}>
                    <a href="/dashboard" className={styles.logoLink}>
                        <i data-lucide="activity" className={styles.logoIcon}></i>
                        <span className={styles.brandName}>
                            <span className={styles.textPrimary}>PRIME</span>
                            <span className={styles.textSecondary}>LAB</span>
                        </span>
                    </a>
                    <div className={styles.contactInfo}>
                        <div className={styles.infoItem}>
                            <i data-lucide="phone" className={styles.infoIcon}></i>
                            <div className={styles.infoText}>
                                <span className={styles.infoLabel}>EMERGENCY</span>
                                <a href="tel:0926-638-6300" className={styles.infoValue}>0926-638-6300</a>
                            </div>
                        </div>
                        <div className={styles.infoItem}>
                            <i data-lucide="clock" className={styles.infoIcon}></i>
                            <div className={styles.infoText}>
                                <span className={styles.infoLabel}>WORK HOUR</span>
                                <span className={styles.infoValue}>07:00 - 17:00 Everyday</span>
                            </div>
                        </div>
                        <div className={styles.infoItem}>
                            <i data-lucide="map-pin" className={styles.infoIcon}></i>
                            <div className={styles.infoText}>
                                <span className={styles.infoLabel}>LOCATION</span>
                                <span className={styles.infoValue}>Bulihan, Malolos, Bulacan</span>
                            </div>
                        </div>
                    </div>
                </div>
            </header>

            <nav className={`${styles.bgPurple500} ${styles.textWhite}`}>
                <div className={styles.navContent}>
                    <div className={styles.navLinks}>
                        <a href="/dashboard" className={styles.hoverTextPurple200}>Home</a>
                        <a href="/services" className={styles.hoverTextPurple200}>Services</a>
                        <a href="/aboutUs" className={styles.hoverTextPurple200}>About us</a>
                        <a href="/contactUs" className={styles.hoverTextPurple200}>Contact</a>
                    </div>
                    <div className={styles.navActions}>
                        <button className={styles.btnIcon} aria-label="Search">
                            <i data-lucide="search"></i>
                        </button>
                        <button className={styles.btnAppointment}>Appointment</button>
                        <a href="/loginpage">
                            <button className={styles.btnLogout}>Log out</button>
                        </a>
                    </div>
                </div>
            </nav>

            <main className={styles.bgGradientPurple}>
                <div className={styles.container}>
                    <h1 className={styles.pageTitle}>Book an Appointment</h1>
                    <div className={styles.appointmentContainer}>
                        <div className={styles.appointmentForm}>
                            <h2 className={styles.formTitle}>Book Appointment</h2>
                            <p className={styles.formDescription}>Please fill out the form below to schedule your appointment with PrimeLab.</p>

                            {successMessage && <p className="success-message">{successMessage}</p>}
                            {errorMessage && <p className="error-message">{errorMessage}</p>}

                            <form className={styles.bookingForm} onSubmit={handleSubmit}>
                                <div className={styles.formGrid}>
                                    <div className={styles.formGroup}>
                                        <label htmlFor="name">Name</label>
                                        <input type="text" id="name" name="name" className={styles.formInput} value={formData.name} onChange={handleChange} required />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label htmlFor="gender">Gender</label>
                                        <select id="gender" name="gender" className={styles.formInput} value={formData.gender} onChange={handleChange} required>
                                            <option value="">Select gender</option>
                                            <option value="male">Male</option>
                                            <option value="female">Female</option>
                                            <option value="other">Other</option>
                                        </select>
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label htmlFor="birthday">Birthday</label>
                                        <input type="date" id="birthday" name="birthday" className={styles.formInput} value={formData.birthday} onChange={handleChange} required />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label htmlFor="service">Service</label>
                                        <select id="service" name="service" className={styles.formInput} value={formData.service} onChange={handleChange} required>
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
                                        <input type="date" id="date" name="date" className={styles.formInput} value={formData.date} onChange={handleChange} required />
                                    </div>
                                    <div className={styles.formGroup}>
                                        <label htmlFor="time">Time</label>
                                        <input type="time" id="time" name="time" className={styles.formInput} min="07:00" max="17:00" value={formData.time} onChange={handleChange} required />
                                    </div>
                                </div>
                                <div className={`${styles.formGroup} ${styles.fullWidth}`}>
                                    <label htmlFor="message">Additional Message</label>
                                    <textarea id="message" name="message" className={styles.formInput} rows="4" value={formData.message} onChange={handleChange}></textarea>
                                </div>
                                <button type="submit" className={styles.submitBtn}>BOOK APPOINTMENT</button>
                            </form>
                        </div>

                        <div className={styles.scheduleSection}>
                            <h2 className={styles.scheduleTitle}>Schedule hours</h2>
                            <div className={styles.scheduleTable}>
                                {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'].map(day => (
                                    <div className={styles.scheduleRow} key={day}>
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
                </div>
            </main>

            <script src="https://unpkg.com/lucide@latest"></script>
            <script>
                lucide.createIcons();
            </script>
        </div>
    );
}
