import styles from './AdminFooter.module.css';

export function AdminFooter() {
  return (
    <footer className={styles._footer}>
      <div className={styles.container}>
        <div className={styles.left}>
          <span className={styles.dot} />
          <span>JRAE Super Admin Console</span>
        </div>
        <div className={styles.muted}>View-only tools for user data</div>
      </div>
    </footer>
  );
}

