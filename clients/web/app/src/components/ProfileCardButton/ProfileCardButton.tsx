import React from "react";
import { useMatrixStore, useMyProfile } from "use-zion-client";
import { ProfileSettingsCard } from "@components/Cards/ProfileSettingsCard";
import { Avatar, TooltipRenderer } from "@ui";

export const ProfileCardButton = () => {
  const { isAuthenticated, userId, username } = useMatrixStore();
  const myProfile = useMyProfile();

  return !isAuthenticated ? null : (
    <TooltipRenderer
      layoutId="topbar"
      trigger="click"
      placement="horizontal"
      render={
        <ProfileSettingsCard
          userId={userId}
          username={username}
          avatarUrl={myProfile?.avatarUrl}
          displayName={myProfile?.displayName}
        />
      }
    >
      {({ triggerProps }) => (
        <Avatar src={myProfile?.avatarUrl} size="avatar_x4" {...triggerProps} />
      )}
    </TooltipRenderer>
  );
};
