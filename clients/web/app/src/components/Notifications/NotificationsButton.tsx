import React from "react";
import { NotificationCard } from "@components/Cards/NotificationCard";
import { Box, Icon, TooltipRenderer } from "@ui";

export const NotificationsButton = () => (
  <TooltipRenderer
    trigger="click"
    layoutId="topbar"
    render={<NotificationCard />}
  >
    {({ triggerProps }) => (
      <Box {...triggerProps}>
        <Icon size="square_lg" type="bell" background="level2" />
      </Box>
    )}
  </TooltipRenderer>
);
