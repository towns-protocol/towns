import React from "react";
import { NavLink, Outlet, useMatch, useResolvedPath } from "react-router-dom";
import { Box, Heading, SizeBox } from "@ui";
import { Stack } from "ui/components/Stack/Stack";
import { LiquidContainer } from "./SpacesIndex";

export const HomeIndex = () => (
  <Stack horizontal grow justifyContent="center" paddingY="lg" basis="1200">
    <LiquidContainer fullbleed position="relative">
      <SizeBox grow gap="lg">
        <HomeNav />
        <Outlet />
      </SizeBox>
    </LiquidContainer>
  </Stack>
);

export const HomeNav = () => (
  <Stack horizontal gap="lg">
    <HomeNavItem to="/">Highlights </HomeNavItem>
    <HomeNavItem to="/proposals">Proposals</HomeNavItem>
    <HomeNavItem to="/members">Members</HomeNavItem>
  </Stack>
);

const HomeNavItem = (props: {
  children: React.ReactNode;
  to: string;
  exact?: boolean;
}) => {
  const { to, exact } = props;
  const resolved = useResolvedPath(`/${to === "/" ? "" : to}`);

  const match = useMatch({
    path: resolved.pathname || "/",
    end: to === "/" || exact,
  });
  return (
    <Box>
      <NavLink to={props.to}>
        <Heading level={2} color={match ? "default" : "gray2"}>
          {props.children}
        </Heading>
      </NavLink>
    </Box>
  );
};
