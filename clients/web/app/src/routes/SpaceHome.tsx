import React from "react";
import { Outlet, useMatch, useResolvedPath } from "react-router";
import { NavLink } from "react-router-dom";

import { RoomIdentifier, useSpaceId } from "use-zion-client";
import { Box, Button, SizeBox } from "@ui";
import { Stack } from "ui/components/Stack/Stack";
import { LiquidContainer } from "./SpacesIndex";

export const SpaceHome = () => {
  const spaceId = useSpaceId();
  if (!spaceId) {
    return null;
  }
  return (
    <Stack horizontal grow justifyContent="center" basis="1200">
      <LiquidContainer fullbleed position="relative">
        <SizeBox grow gap="lg">
          <Box paddingX="lg" paddingTop="lg">
            <SpaceNav spaceId={spaceId} />
          </Box>
          <Box grow position="relative" paddingX="lg">
            <Outlet />
          </Box>
        </SizeBox>
      </LiquidContainer>
    </Stack>
  );
};

export const SpaceNav = (props: { spaceId: RoomIdentifier }) => (
  <Stack horizontal gap="md">
    <SpaceNavItem to={`/spaces/${props.spaceId.slug}/`}>
      Highlights
    </SpaceNavItem>
    <SpaceNavItem to={`/spaces/${props.spaceId.slug}/proposals`}>
      Proposals
    </SpaceNavItem>
    <SpaceNavItem to={`/spaces/${props.spaceId.slug}/members`}>
      Members
    </SpaceNavItem>
  </Stack>
);

const SpaceNavItem = (props: {
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
        <Button size="button_md" tone={match ? "cta1" : "level2"}>
          {props.children}
        </Button>
      </NavLink>
    </Box>
  );
};

export default SpaceHome;
