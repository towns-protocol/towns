import React from "react";
import { useParams } from "react-router-dom";
import { MainAction } from "@components/MainActions";
import { NavContainer } from "@components/MainNav/MainNav";
import {
  SpaceNavItem,
  mockSpaces,
} from "@components/SpaceNavItem/SpaceNavItem";
import { Box } from "@ui";

export const Spaces = () => {
  const { space: spaceId } = useParams();
  const space = mockSpaces.find((s) => s.id === spaceId) ?? mockSpaces[0];
  return (
    <Box grow direction="row">
      <NavContainer>
        <MainAction icon="back" id="" label="Back" />
        {space && (
          <SpaceNavItem id={space.id} avatar={space.avatar} name={space.name} />
        )}
        <MainAction icon="threads" id="" label="Threads" />
        <MainAction icon="at" id="" label="Mentions" />
      </NavContainer>
      <Box grow="x9" />
    </Box>
  );
};
