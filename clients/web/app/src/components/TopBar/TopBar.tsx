import React from "react";
import { Link } from "react-router-dom";
import { useMatrixStore } from "use-matrix-client";
import { NotificationCard } from "@components/Cards/NotificationCard";
import { ProfileSettingsCard } from "@components/Cards/ProfileSettingsCard";
import { Logo } from "@components/Logo/Logo";
import { Search } from "@components/Search";
import { Login } from "@components/Web3/Login";
import { Avatar, Box, Icon, Stack, TooltipRenderer } from "@ui";

const positionTop = {
  top: 0,
};

export const TopBar = (props: { onToggleTheme?: () => void }) => {
  const { isAuthenticated, username, userId } = useMatrixStore();

  return (
    <Stack
      borderBottom
      direction="row"
      shrink={false}
      height="height_xl"
      paddingX="md"
      background="level2"
      alignItems="center"
      gap="md"
      color="gray2"
      position="sticky"
      style={positionTop}
    >
      <Box color="default">
        <Link to="/">
          <Logo />
        </Link>
      </Box>
      <Box grow />
      {!isAuthenticated ? (
        <Login />
      ) : (
        <>
          <Search />
          <TooltipRenderer
            trigger="click"
            layoutId="topbar"
            render={<NotificationCard />}
          >
            {({ triggerProps }) => (
              <Box {...triggerProps}>
                <Icon size="square_lg" type="bell" background="level1" />
              </Box>
            )}
          </TooltipRenderer>
          <TooltipRenderer
            layoutId="topbar"
            trigger="click"
            render={<ProfileSettingsCard userId={userId} username={username} />}
          >
            {({ triggerProps }) => (
              <Avatar circle size="avatar_lg" {...triggerProps} />
            )}
          </TooltipRenderer>
        </>
      )}
    </Stack>
  );
};
