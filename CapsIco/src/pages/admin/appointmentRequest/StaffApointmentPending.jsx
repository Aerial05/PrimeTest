import React, { useState } from 'react';
import styles from './StaffApointmentPending.module.css';
import { HeaderInfoBar } from '/src/components/user/HeaderInfoBar/HeaderInfoBar';
import { NavBar } from '/src/components/user/NavBar/NavBar';
import { Footer } from '@/Components/user/footer/Footer';

export function StaffApointmentPending() {
    const [appointments, setAppointments] = useState([
        {
            id: '1',
            patientName: 'John Doe',
            patientGender: 'Male',
            patientBday: '1990-01-01',
            service: 'Consultation',
            appointDate: '2024-05-01',
            appointTime: '10:00:00',
            email: 'john.doe@example.com',
            message: 'Looking forward to my appointment.',
            stats: 'pending',
        },
        {
            id: '2',
            patientName: 'Jane Smith',
            patientGender: 'Female',
            patientBday: '1985-05-15',
            service: 'Checkup',
            appointDate: '2024-05-02',
            appointTime: '11:00:00',
            email: 'jane.smith@example.com',
            message: 'Please confirm my appointment.',
            stats: 'pending',
        },
    ]);
    const [loading, setLoading] = useState(false);

    const handleAction = (appointID, action) => {
        setAppointments(prevAppointments =>
            prevAppointments.map(appointment =>
                appointment.id === appointID
                    ? { ...appointment, stats: action === 'accept' ? 'confirmed' : 'cancelled' }
                    : appointment
            )
        );
    };

    const handleDelete = appointID => {
        if (window.confirm('Are you sure you want to delete this appointment?')) {
            setAppointments(prevAppointments =>
                prevAppointments.filter(appointment => appointment.id !== appointID)
            );
        }
    };

    if (loading) {
        return <p>Loading appointments...</p>;
    }

    return (
        <div className={styles.container}>
            <header className={styles.siteHeader}>
                <HeaderInfoBar />
                <NavBar />
                
            </header>
            <main className={styles.mainContent}>
                <h2>Patient Appointment Request</h2>
                <div className={styles.appointmentTableContainer}>
                    <table className={styles.appointmentTable}>
                        <thead>
                            <tr>
                                <th>Patient Name</th>
                                <th>Age</th>
                                <th>Gender</th>
                                <th>Birthday</th>
                                <th>Service</th>
                                <th>Date</th>
                                <th>Time</th>
                                <th>Email</th>
                                <th>Message</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {appointments.length > 0 ? (
                                appointments.map(appointment => {
                                    const birthDate = new Date(appointment.patientBday);
                                    const age = new Date().getFullYear() - birthDate.getFullYear();
                                    return (
                                        <tr key={appointment.id}>
                                            <td>{appointment.patientName}</td>
                                            <td>{age}</td>
                                            <td>{appointment.patientGender}</td>
                                            <td>{birthDate.toLocaleDateString()}</td>
                                            <td>{appointment.service}</td>
                                            <td>{new Date(appointment.appointDate).toLocaleDateString()}</td>
                                            <td>{new Date(appointment.appointTime).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}</td>
                                            <td>{appointment.email}</td>
                                            <td>{appointment.message}</td>
                                            <td>
                                                <span className={`${styles.statusBadge} ${styles['status' + appointment.stats.charAt(0).toUpperCase() + appointment.stats.slice(1)]}`}>
                                                    {appointment.stats.charAt(0).toUpperCase() + appointment.stats.slice(1)}
                                                </span>
                                            </td>
                                            <td className={styles.buttonGroup}>
                                                <button 
                                                    className={`${styles.button} ${styles.buttonPrimary}`}
                                                    onClick={() => handleAction(appointment.id, 'accept')}
                                                >
                                                    Accept
                                                </button>
                                                <button 
                                                    className={`${styles.button} ${styles.buttonDanger}`}
                                                    onClick={() => handleAction(appointment.id, 'reject')}
                                                >
                                                    Reject
                                                </button>
                                                <button 
                                                    className={`${styles.button} ${styles.buttonSecondary}`}
                                                    onClick={() => handleDelete(appointment.id)}
                                                >
                                                    Delete
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="11" style={{textAlign: 'center'}}>No appointments found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </main>
            <Footer />
        </div>
    );
}

