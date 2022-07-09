import React from "react";
import { Link, NavLink, useMatch, useResolvedPath } from "react-router-dom";
import { useMatrixStore } from "use-matrix-client";
import { MinimalLogo } from "@components/Logo/Logo";
import { ProfileCardButton } from "@components/ProfileCardButton/ProfileCardButton";
import { Login } from "@components/Web3/Login";
import { Box, ButtonText, Stack } from "@ui";
import { atoms } from "ui/styles/atoms.css";
import * as styles from "./TopBar.css";

const positionTop = {
  top: 0,
};

export const TopBar = (props: {
  onToggleTheme?: () => void;
  authenticated: boolean;
  username?: string | null;
  userId?: string | null;
}) => {
  const { authenticated: isAuthenticated, username, userId } = props;
  return (
    <Stack
      borderBottom
      direction="row"
      shrink={false}
      height="x6"
      paddingX="md"
      gap="md"
      color="gray2"
      position="sticky"
      style={positionTop}
    >
      <Box color="default" justifyContent="center" width="100">
        <Link to="/">
          <MinimalLogo className={atoms({ height: "x4" })} />
        </Link>
      </Box>
      <Stack grow height="100%" alignItems="center" justifyContent="stretch">
        {!isAuthenticated && <TopMenu />}
      </Stack>
      <Box />
      <Box justifyContent="center" alignItems="end" width="100">
        {!isAuthenticated || !(username && userId) ? (
          <Login />
        ) : (
          <>
            <ProfileCardButton username={username} userId={userId} />
          </>
        )}
      </Box>
    </Stack>
  );
};

const TopMenu = () => {
  // todo: there must be a smoother way of doing this...
  const manifesto = useMatch(`manifesto`);
  const protocol = useMatch(`protocol`);
  const dao = useMatch(`dao`);
  // "chat" link should be highlighted for all nested "app" routes. The
  // following ones need to be excluded
  const isAppRoute = !(manifesto || protocol || dao);

  const { isAuthenticated } = useMatrixStore();
  return (
    <Stack horizontal height="100%" justifyContent="spaceBetween">
      {isAuthenticated && (
        <TopMenuLink exact={!isAppRoute} to="/">
          Chat
        </TopMenuLink>
      )}
      <TopMenuLink to="/manifesto">Manifesto</TopMenuLink>
      <TopMenuLink to="/protocol">Protocol</TopMenuLink>
      <TopMenuLink to="/dao">DAO</TopMenuLink>
    </Stack>
  );
};

const TopMenuLink = ({
  to,
  exact,
  children,
}: {
  children: React.ReactNode;
  to: string;
  exact?: boolean;
}) => {
  const resolved = useResolvedPath(`/${to === "/" ? "" : to}`);

  const match = useMatch({
    path: resolved.pathname || "/",
    end: !!exact,
  });

  return (
    <Stack gap="sm">
      <Box height="2" />
      <Box grow centerContent paddingX="lg">
        <NavLink to={to}>
          <ButtonText
            size="md"
            color={match ? "cta1" : "gray2"}
            className={styles.buttonText}
          >
            {children}
          </ButtonText>
        </NavLink>
      </Box>
      <Box height="2" width="100%" background={match ? "cta1" : undefined} />
    </Stack>
  );
};
