import React, { useEffect } from 'react';
import { SettingsSidebar } from '/src/components/admin/settings/SettingsSidebar/SettingsSidebar';
import { SettingsContent } from '/src/components/admin/settings/SettingsContent/SettingsContent';

import styles from './SettingsPage.module.css';
import { createIcons, icons } from 'lucide';

export function SettingsPage() {
  useEffect(() => {
    createIcons({ icons });
  }, []);

  return (
    <>

      <div className="banner">
        <div className="container">
          <p>Configuration</p>
          <h1>Settings</h1>
        </div>
      </div>

      <main className="container">
        <div className={styles.settingsContainer}>
          <SettingsSidebar />
          <SettingsContent />
        </div>
      </main>
    </>
  );
}
