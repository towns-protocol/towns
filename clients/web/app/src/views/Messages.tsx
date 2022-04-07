import React from "react";
import { ChatWindow } from "@components/ChatWindow";
import { MessageList } from "@components/MessageList";
import { Box } from "@ui";
import { MainNav, NavContainer } from "@components/MainNav/MainNav";

export const Messages = () => (
  <>
    <MainNav />
    <NavContainer>
      <MessageList />
    </NavContainer>
    <Box grow="x9">
      <ChatWindow />
    </Box>
  </>
);
