import { ChatWindow } from "@components/ChatWindow";
import { DirectMessages } from "@components/DirectMessages";
import { MainActions } from "@components/MainActions";
import { SpaceList } from "@components/SpaceList";
import { Box } from "@ui";
import React from "react";

export const App = () => (
  <Box direction="row" grow absoluteFill>
    <Box basis={150} grow="x1" background="shade2">
      <MainActions />
      <SpaceList />
    </Box>
    <Box basis={150} grow="x1" background="shade1">
      <DirectMessages />
    </Box>
    <Box grow="x9" borderLeft="regular">
      <ChatWindow />
    </Box>
  </Box>
);
