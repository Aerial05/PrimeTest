import React, { useEffect, useState } from 'react';
import { SettingsSidebar } from '/src/components/user/SettingsSidebar/SettingsSidebar';
import { SettingsContent } from '/src/pages/user/settings/Profile/SettingsContentUser';
import { RulesSettingsPage } from '/src/pages/user/settings/Rules/RulesSettingsPage';
import { HistorySettingsPage } from '/src/pages/user/settings/History/History.SettingsPage';

import styles from './UserSettingsPage.module.css';
import { createIcons, icons } from 'lucide';

export function UserSettingsPage() {
  const [active, setActive] = useState('profile');

  useEffect(() => {
    createIcons({ icons });
  }, []);

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
