import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { SettingsSidebar } from '/src/components/user/SettingsSidebar/SettingsSidebar';
import { SettingsContent } from '/src/pages/user/settings/Profile/SettingsContentUser';
import { RulesSettingsPage } from '/src/pages/user/settings/Rules/RulesSettingsPage';
import { HistorySettingsPage } from '/src/pages/user/settings/History/History.SettingsPage';

import styles from './UserSettingsPage.module.css';
import { createIcons, icons } from 'lucide';

export function UserSettingsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const query = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const tabParam = query.get('tab');
  const initial = (tabParam === 'rules' || tabParam === 'history' || tabParam === 'profile') ? tabParam : 'profile';
  const [active, setActive] = useState(initial);

  useEffect(() => {
    createIcons({ icons });
  }, []);

  // Keep active in sync if the URL changes externally
  useEffect(() => {
    const qp = new URLSearchParams(location.search);
    const t = qp.get('tab');
    const valid = (t === 'rules' || t === 'history' || t === 'profile') ? t : 'profile';
    if (valid !== active) setActive(valid);
  }, [location.search]);

  // Push tab changes to URL for shareable/refreshable deep links
  useEffect(() => {
    const qp = new URLSearchParams(location.search);
    if (qp.get('tab') !== active) {
      qp.set('tab', active);
      navigate({ search: `?${qp.toString()}` }, { replace: true });
    }
  }, [active]);

  return (
    <>

      <div className={styles.banner}>
        <div className={styles.container}>
          <p>Configuration</p>
          <h1>Settings</h1>
        </div>
      </div>

      <main className={styles.container}>
        <div className={styles.settingsContainer}>
          <SettingsSidebar active={active} onSelect={setActive} />
          {active === 'profile' && <SettingsContent />}
          {active === 'rules' && <RulesSettingsPage />}
          {active === 'history' && <HistorySettingsPage />}
        </div>
      </main>
    </>
  );
}
