import { ChatWindow } from "@components/ChatWindow";
import { MainActions } from "@components/MainActions";
import { MessageList } from "@components/MessageList/MessageList";
import { SpaceList } from "@components/SpaceList";
import { TopBar } from "@components/TopBar";
import { Box } from "@ui";
import React from "react";

export const App = () => (
  <Box grow absoluteFill>
    <TopBar />
    <Box direction="row" grow>
      <Box grow background="level1" borderRight>
        <MainActions />
        <SpaceList />
      </Box>
      <Box grow borderRight>
        <MessageList />
      </Box>
      <Box grow="x9">
        <ChatWindow />
      </Box>
    </Box>
  </Box>
);
