import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
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

  const onSetupClick = useCallback(() => {
    navigate("/onboarding");
  }, [navigate]);

  const { logout } = useMatrixClient();

  const onLogoutClick = useCallback(() => {
    logout();
  }, [logout]);

  return (
    <Card paddingBottom="md" width="300" fontSize="md">
      <Stack horizontal padding gap="md" alignItems="center">
        <Box>
          <Avatar circle size="avatar_md" />
        </Box>
        <Stack grow gap="sm" fontWeight="strong" color="gray2">
          <Heading level={5}>
            {username && shortenAddress(username, 6, 2)}
          </Heading>
          <Heading level={5}>{userId && shortenAddress(userId, 6, 16)}</Heading>
        </Stack>
      </Stack>
      <Divider space="xs" />
      <MenuItem onClick={onThemeClick}>
        Switch to {theme !== "light" ? "light" : "dark"} theme
      </MenuItem>
      <MenuItem onClick={onSettingsClick}>Profile</MenuItem>
      <MenuItem onClick={onSetupClick}>Setup</MenuItem>

      <Divider space="xs" />
      <MenuItem onClick={onLogoutClick}>Logout</MenuItem>
    </Card>
  );
};

const MenuItem = ({ children, ...props }: BoxProps) => (
  <Box grow paddingY="sm" background={{ hover: "level3" }} {...props}>
    <Stack horizontal paddingX="md" cursor="pointer">
      {children}
    </Stack>
  </Box>
);

export const shortenAddress = (
  s: string,
  charsStart = 6,
  charsEnd = 2,
  delimiter = "..",
) => {
  return (s?.length ?? 0) <= charsStart + delimiter.length + charsEnd
    ? s
    : `${s.substring(0, charsStart)}${delimiter}${s.substring(
        s.length - charsEnd,
      )}`;
};
