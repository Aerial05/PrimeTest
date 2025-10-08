import React, { useEffect, useState } from 'react';
import { SettingsSidebar } from '/src/components/admin/settings/SettingsSidebar/SettingsSidebar';
import { SettingsContent } from '/src/components/admin/settings/SettingsContent/SettingsContent';
import { Backup } from '/src/components/admin/settings/Backup/Backup';

import styles from './SettingsPage.module.css';
import { createIcons, icons } from 'lucide';

export function SettingsPage() {
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
          {active === 'backup' && <Backup />}
          {active === 'system' && (
            <div className={styles.container}>
              <h2>System</h2>
              <p className="muted">System settings are under construction.</p>
            </div>
          )}
        </div>
      </main>
    </>
  );
}
