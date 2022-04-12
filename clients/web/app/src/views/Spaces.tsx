import React from "react";
import { Outlet } from "react-router";
import { useParams } from "react-router-dom";
import { NavContainer } from "@components/MainNav/MainNav";
import { MainAction } from "@components/MainNavActions/MainNavActions";
import {
  SpaceNavItem,
  mockSpaces,
} from "@components/SpaceNavItem/SpaceNavItem";
import { Box } from "@ui";

export const Spaces = () => {
  const { space: spaceId } = useParams();
  const space = mockSpaces.find((s) => s.id === spaceId) ?? mockSpaces[0];
  return (
    // <Box grow direction="row">
    <>
      <NavContainer>
        <MainAction icon="back" link="/" id="" label="Back" />
        {space && (
          <SpaceNavItem id={space.id} avatar={space.avatar} name={space.name} />
        )}
        <MainAction icon="threads" link="" id="" label="Threads" />
        <MainAction icon="at" id="" link="" label="Mentions" />
      </NavContainer>
      <Box grow="x9">
        <Outlet />
      </Box>
    </>
    // </Box>
  );
};
