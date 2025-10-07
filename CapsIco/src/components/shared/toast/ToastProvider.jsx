import React, { createContext, useContext, useMemo, useRef, useState } from 'react';
import styles from './Toast.module.css';

const ToastContext = createContext({ show: () => {} });

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);
  const [loadingMap, setLoadingMap] = useState({}); // toastId -> boolean

  const remove = (id) => setToasts((prev) => prev.filter((t) => t.id !== id));

  const show = ({ type = 'success', title, message, duration = 3000, actions } = {}) => {
    const id = `${Date.now()}_${idRef.current++}`;
    const toast = { id, type, title, message, actions: Array.isArray(actions) ? actions.slice(0, 3) : null };
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
              <span className={styles.icon} aria-hidden="true">
                {t.type === 'error' ? (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2c5.523 0 10 4.477 10 10s-4.477 10-10 10S2 17.523 2 12 6.477 2 12 2zm1 13v2h-2v-2h2zm0-8v6h-2V7h2z"/></svg>
                ) : (
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 1 0 20 10 10 0 0 1 0-20zm-1.2 13.2l6-6-1.6-1.6-4.4 4.4-2.4-2.4-1.6 1.6 4 4z"/></svg>
                )}
              </span>
              <span className={styles.toastTitle}>{t.title || (t.type === 'error' ? 'Error' : 'Success')}</span>
              <div className={styles.headerRight}>
                {loadingMap[t.id] && (
                  <span className={styles.spinner} aria-label="Loading"/>
                )}
                <button className={styles.closeBtn} aria-label="Close" onClick={() => remove(t.id)}>×</button>
              </div>
            </div>
            {t.message && <div className={styles.toastBody}>{t.message}</div>}
            {t.actions && t.actions.length > 0 && (
              <div className={styles.toastActions}>
                {t.actions.map((a, idx) => (
                  <button
                    key={idx}
                    className={`${styles.toastBtn} ${a?.kind === 'confirm' ? styles.toastBtnConfirm : a?.kind === 'primary' ? styles.toastBtnPrimary : styles.toastBtnGhost}`}
                    disabled={!!loadingMap[t.id]}
                    onClick={() => {
                      let usedAsync = false;
                      try {
                        const maybe = a?.onClick && a.onClick();
                        // If async, keep toast open until resolved; on error, keep open
                        if (maybe && typeof maybe.then === 'function') {
                          usedAsync = true;
                          setLoadingMap((m) => ({ ...m, [t.id]: true }));
                          maybe.then(() => {
                            setLoadingMap((m) => ({ ...m, [t.id]: false }));
                            remove(t.id);
                          }).catch(() => {
                            setLoadingMap((m) => ({ ...m, [t.id]: false }));
                          });
                          return;
                        }
                      } finally {
                        // Only auto-remove for sync actions
                        if (!usedAsync) remove(t.id);
                      }
                    }}
                  >
                    {loadingMap[t.id] && a?.kind === 'confirm' ? 'Sending…' : (a?.label || 'OK')}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
