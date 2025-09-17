import React, { createContext, useContext, useMemo, useRef, useState } from 'react';
import styles from './Toast.module.css';

const ToastContext = createContext({ show: () => {} });

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const remove = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const show = ({ type = 'success', title, message, duration = 3000 } = {}) => {
    const id = `${Date.now()}_${idRef.current++}`;
    const toast = { id, type, title, message };
    setToasts((prev) => [...prev, toast]);
    if (duration > 0) {
      setTimeout(() => remove(id), duration);
    }
    return id;
  };

  const value = useMemo(() => ({ show }), []);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className={styles.container} aria-live="polite" aria-atomic="true">
        {toasts.map((t) => (
          <div key={t.id} className={`${styles.toast} ${t.type === 'error' ? styles.error : styles.success}`}>
            <div className={styles.toastHeader}>
              <span className={styles.toastTitle}>{t.title || (t.type === 'error' ? 'Error' : 'Success')}</span>
              <button className={styles.closeBtn} aria-label="Close" onClick={() => remove(t.id)}>×</button>
            </div>
            {t.message && <div className={styles.toastBody}>{t.message}</div>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
