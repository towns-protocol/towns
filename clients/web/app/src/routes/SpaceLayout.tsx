import React, { useEffect } from "react";
import { useParams } from "react-router";
import { NavLink, Outlet, useMatch, useResolvedPath } from "react-router-dom";
import { useMatrixClient } from "use-matrix-client";
import { Stack } from "ui/components/Stack/Stack";
import { Box, Heading, SizeBox } from "@ui";
import { LiquidContainer } from "./SpacesIndex";

export const SpaceLayout = () => {
  const { spaceId } = useParams();
  const { syncSpace } = useMatrixClient();

  useEffect(() => {
    (async () => {
      if (spaceId) {
        try {
          await syncSpace(spaceId);
        } catch (reason) {
          console.log("SpacesIndex error:", reason);
        }
      }
    })();
  }, [spaceId, syncSpace]);

  if (!spaceId) {
    return null;
  }
  return (
    <Stack horizontal grow justifyContent="center" paddingY="lg" basis="1200">
      <LiquidContainer fullbleed position="relative">
        <SizeBox grow gap="lg" paddingTop="lg">
          <SpaceNav spaceId={spaceId} />
          <Outlet />
        </SizeBox>
      </LiquidContainer>
    </Stack>
  );
};

export const SpaceNav = (props: { spaceId: string }) => (
  <Stack horizontal gap="lg">
    <SpaceNavItem to={`/spaces/${props.spaceId}`}>All Highlights </SpaceNavItem>
    <SpaceNavItem to={`/spaces/${props.spaceId}/proposals`}>
      Proposals
    </SpaceNavItem>
    <SpaceNavItem to={`/spaces/${props.spaceId}/members`}>Members</SpaceNavItem>
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
        <Heading level={2} color={match ? "default" : "gray2"}>
          {props.children}
        </Heading>
      </NavLink>
    </Box>
  );
};
