
import React from 'react';
import { Link } from 'react-router-dom';
import styles from "./Login.module.css"; 

export function LoginForm() {
    return (
        <div className={styles.container}> 
            <div className={`${styles['form-box']} ${styles.active}`} id="login-box"> 
                <h2>PrimeLab Appoint</h2>
                <form action="login.php" method="POST">
                    <div className={styles['input-group']}> 
                        <label htmlFor="login-username">Username</label>
                        <input type="text" id="login-username" name="username" required />
                    </div>
                    <div className={styles['input-group']}> 
                        <label htmlFor="login-password">Password</label>
                        <input type="password" id="login-password" name="password" required />
                    </div>
                    <button type="submit" className={styles.btn}>Log In</button> 
                    <div className={styles['toggle-link']}> 
                        <p>Don't have an account? 
                        <Link to="/register"> Register here</Link></p>
                    </div>
                </form>
            </div>
        </div>
    );
}
