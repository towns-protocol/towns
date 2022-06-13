import React, { useCallback } from "react";
import { useNavigate } from "react-router";
import { useMatrixClient } from "use-matrix-client";
import { Avatar, Box, BoxProps, Card, Divider, Heading, Stack } from "@ui";
import { useStore } from "store/store";

type Props = { userId: string | null; username: string | null };

export const ProfileSettingsCard = (props: Props) => {
  const { userId = "", username = "" } = props;

  const { setTheme, theme } = useStore((state) => ({
    theme: state.theme,
    setTheme: state.setTheme,
  }));

  const onThemeClick = () => {
    setTheme(theme === "light" ? "dark" : "light");
  };

  const navigate = useNavigate();

  const onSettingsClick = useCallback(() => {
    navigate("/me");
  }, [navigate]);

  const { logout } = useMatrixClient();

  const onLogoutClick = useCallback(() => {
    logout();
  }, [logout]);

  return (
    <Card padding="md" gap="sm" width="300" fontSize="md">
      <Stack horizontal gap="md" alignItems="center">
        <Box>
          <Avatar circle size="avatar_x6" />
        </Box>
        <Stack grow gap="sm" fontWeight="strong" color="gray2">
          <Heading level={5}>{username && shorten(username, 6, 2)}</Heading>
          <Heading level={5}>{userId && shorten(userId, 6, 16)}</Heading>
        </Stack>
      </Stack>
      <Divider space="xs" />
      <MenuItem onClick={onThemeClick}>
        Switch to {theme !== "light" ? "light" : "dark"} theme
      </MenuItem>
      <MenuItem onClick={onSettingsClick}>Profile</MenuItem>
      <Divider space="xs" />
      <MenuItem onClick={onLogoutClick}>Logout</MenuItem>
    </Card>
  );
};

const MenuItem = (props: BoxProps) => (
  <Stack horizontal cursor="pointer" {...props} />
);

const shorten = (s: string, charsStart = 6, charsEnd = 2, delimiter = "..") => {
  return (s?.length ?? 0) <= charsStart + delimiter.length + charsEnd
    ? s
    : `${s.substring(0, charsStart)}${delimiter}${s.substring(
        s.length - charsEnd,
      )}`;
};
