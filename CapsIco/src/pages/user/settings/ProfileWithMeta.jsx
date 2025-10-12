import React, { useEffect, useMemo } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { SettingsSidebar } from "/src/components/user/SettingsSidebar/SettingsSidebar";
import styles from "./UserSettingsPage.module.css";

// Profile settings shell: renders sidebar and nested content via <Outlet />
export function ProfileWithMeta() {
  const location = useLocation();
  const navigate = useNavigate();

  // Back-compat: map legacy query param ?tab=... to nested routes
  const tabParam = useMemo(() => {
    try {
      const qp = new URLSearchParams(location.search);
      const t = (qp.get('tab') || '').toLowerCase();
      if (t === 'history') return 'appointments';
      if (t === 'appointments' || t === 'rules' || t === 'profile') return t;
      return '';
    } catch { return ''; }
  }, [location.search]);

  useEffect(() => {
    if (!tabParam) return;
    const base = '/profile';
    const target = tabParam === 'profile' ? base : `${base}/${tabParam}`;
    if ((location.pathname + location.search) !== target) {
      navigate(target, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabParam]);

  // Determine active from current path
  const active = useMemo(() => {
    const p = location.pathname.toLowerCase();
    if (p.endsWith('/appointments')) return 'appointments';
    if (p.endsWith('/rules')) return 'rules';
    return 'profile';
  }, [location.pathname]);

  const handleSelect = (id) => {
    const base = '/profile';
    if (id === 'profile') navigate(base);
    else navigate(`${base}/${id}`);
  };

  return (
    <main className={styles.container}>
      <div className={styles.settingsContainer}>
        <SettingsSidebar active={active} onSelect={handleSelect} />
        {/* Nested route content */}
        <Outlet />
      </div>
    </main>
  );
}

