import { ChatWindow } from "@components/ChatWindow";
import { Highlight } from "@components/Highlight";
import { MainActions } from "@components/MainActions";
import { MessageList } from "@components/MessageList/MessageList";
import { SpaceList } from "@components/SpaceList";
import { TopBar } from "@components/TopBar";
import { Box, Grid, Heading } from "@ui";
import React, { useState } from "react";

export const App = () => {
  const [route] = useState("messages");
  return (
    <Box grow absoluteFill>
      <TopBar />
      <Box direction="row" grow>
        <Box grow background="level1" borderRight>
          <MainActions />
          <SpaceList />
        </Box>
        {route === "home" ? <HomeView /> : <MessageView />}
      </Box>
    </Box>
  );
};

const MessageView = () => (
  <>
    <Box grow borderRight>
      <MessageList />
    </Box>
    <Box grow="x9">
      <ChatWindow />
    </Box>
  </>
);

const HomeView = () => (
  <Box grow="x9" justifyContent="center" direction="row" padding="lg">
    <Box grow gap="md">
      <Heading level={1}>Highlights</Heading>
      <Grid columns={4} gap="lg">
        <Highlight span={2} cover />
        <Highlight span={2} cover />
        <Highlight />
        <Highlight />
        <Highlight />
        <Highlight />
      </Grid>
      <Heading level={2}>Shared with you</Heading>
    </Box>
  </Box>
);
