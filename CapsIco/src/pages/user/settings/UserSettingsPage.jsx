import React, { useEffect } from 'react';
import { SettingsSidebar } from '/src/components/user/SettingsSidebar/SettingsSidebar';
import { SettingsContent } from '/src/components/admin/settings/SettingsContent/SettingsContent';

import styles from './UserSettingsPage.module.css';
import { createIcons, icons } from 'lucide';

export function UserSettingsPage() {
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
          <SettingsSidebar />
          <SettingsContent />
        </div>
      </main>
    </>
  );
}
