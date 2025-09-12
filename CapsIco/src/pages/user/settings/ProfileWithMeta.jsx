import React from "react";
import { UserSettingsPage } from "/src/pages/user/settings/UserSettingsPage";
import { JoinedDate } from "/src/components/user/profile/JoinedDate";

export function ProfileWithMeta() {
  return (
    <div>
      <UserSettingsPage />
      <JoinedDate />
    </div>
  );
}

