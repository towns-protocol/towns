import React from "react";
import { ProfileSettingsCard } from "@components/Cards/ProfileSettingsCard";
import { Avatar, TooltipRenderer } from "@ui";

type Props = {
  userId: string;
  username: string;
};

export const ProfileCardButton = (props: Props) => (
  <TooltipRenderer
    layoutId="topbar"
    trigger="click"
    render={
      <ProfileSettingsCard userId={props.userId} username={props.username} />
    }
  >
    {({ triggerProps }) => <Avatar size="avatar_x4" {...triggerProps} />}
  </TooltipRenderer>
);
