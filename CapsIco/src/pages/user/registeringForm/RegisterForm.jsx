import { Link } from 'react-router-dom';
import styles from './Register.module.css';

export function RegisterForm() {
    return (
        <div className={styles.container}>
            <div className={`${styles.formBox} ${styles.active}`} id="register-box">
                <h2>Register for Medical Portal</h2>
                <form action="register.php" method="POST">
                    <div className={styles.inputGroup}>
                        <label htmlFor="register-first-name">First Name</label>
                        <input type="text" id="register-first-name" name="fname" required />
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="register-middle-name">Middle Name</label>
                        <input type="text" id="register-middle-name" name="mname" />
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="register-last-name">Last Name</label>
                        <input type="text" id="register-last-name" name="lname" required />
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="register-username">Username</label>
                        <input type="text" id="register-username" name="username" required />
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="register-email">Email</label>
                        <input type="email" id="register-email" name="email" required />
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="register-phone">Phone Number</label>
                        <input type="tel" id="register-phone" name="phone" pattern="[0-9]{10}" required />
                        <small>Format: 09123456789</small>
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="register-password">Password</label>
                        <input type="password" id="register-password" name="password" required />
                    </div>
                    <div className={styles.inputGroup}>
                        <label htmlFor="register-confirm-password">Confirm Password</label>
                        <input type="password" id="register-confirm-password" name="confirm-password" required />
                    </div>
                    <button type="submit" className={styles.btn}>Register</button>
                    <div className={styles.toggleLink}>
                        <p>
                            Already have an account? <Link to="/login">Log in here</Link>
                        </p>
                    </div>
                </form>
            </div>
        </div>
    );
}
