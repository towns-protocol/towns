import React from "react";
import { ProfileSettingsCard } from "@components/Cards/ProfileSettingsCard";
import { Avatar, TooltipRenderer } from "@ui";

type Props = {
  userId: string;
  username: string;
  displayName?: string;
  avatarUrl?: string;
};

export const ProfileCardButton = (props: Props) => (
  <TooltipRenderer
    layoutId="topbar"
    trigger="click"
    render={
      <ProfileSettingsCard
        userId={props.userId}
        username={props.username}
        displayName={props.displayName}
      />
    }
  >
    {({ triggerProps }) => (
      <Avatar src={props.avatarUrl} size="avatar_x4" {...triggerProps} />
    )}
  </TooltipRenderer>
);
