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
  const initialTab = query.get('tab') || 'profile';
  const [active, setActive] = useState(initialTab);

  useEffect(() => {
    createIcons({ icons });
  }, []);

  // Keep state in sync with URL changes
  useEffect(() => {
    const tab = query.get('tab') || 'profile';
    if (tab !== active) setActive(tab);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search]);

  // When active changes via sidebar, update URL to persist tab
  const handleSelect = (tab) => {
    setActive(tab);
    const params = new URLSearchParams(location.search);
    params.set('tab', tab);
    navigate({ pathname: location.pathname, search: params.toString() }, { replace: true });
  };

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
          <SettingsSidebar active={active} onSelect={handleSelect} />
          {active === 'profile' && <SettingsContent />}
          {active === 'rules' && <RulesSettingsPage />}
          {active === 'history' && <HistorySettingsPage />}
        </div>
      </main>
    </>
  );
}
