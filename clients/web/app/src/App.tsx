import { DirectMessages } from "components/DirectMessages";
import { MainActions } from "components/MainActions";
import { SpaceList } from "components/SpaceList";
import React from "react";
import { Box } from "ui/components";

export default () => (
  <Box direction="row" grow absoluteFill>
    <Box basis={150} grow={"1"} background="shade2">
      <MainActions />
      <SpaceList />
    </Box>
    <Box basis={150} grow={"1"} background="shade1">
      <DirectMessages />
    </Box>
    <Box grow="9">
      <Box padding="sm">General</Box>
    </Box>
  </Box>
);
