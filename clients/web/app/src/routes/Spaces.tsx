import React from "react";
import { Outlet } from "react-router";
import { useParams } from "react-router-dom";
import { Box } from "@ui";
import { SpaceSideBar } from "@components/SideBars";
import { fakeSpaces } from "data/SpaceData";

export const Spaces = () => {
  const { spaceId } = useParams();
  const space = fakeSpaces.find((s) => s.id === spaceId) ?? fakeSpaces[0];
  return (
    <>
      <SpaceSideBar space={space} />
      <Box grow="x9">
        <Outlet />
      </Box>
    </>
  );
};
