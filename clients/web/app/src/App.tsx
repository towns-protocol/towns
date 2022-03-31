import { ChatWindow } from "@components/ChatWindow";
import { MainActions } from "@components/MainActions";
import { SpaceList } from "@components/SpaceList";
import { TopBar } from "@components/TopBar";
import { Box } from "@ui";
import React from "react";

export const App = () => (
  <Box grow absoluteFill>
    <TopBar />
    <Box direction="row" grow>
      <Box grow="x1" background="level2">
        <MainActions />
        <SpaceList />
      </Box>
      <Box grow="x9" borderLeft>
        <ChatWindow />
      </Box>
    </Box>
  </Box>
);
