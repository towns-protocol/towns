import { ChatWindow } from "@components/ChatWindow";
import { MessageList } from "@components/MessageList";
import { Box } from "@ui";
import React from "react";

export const Messages = () => (
  <>
    <Box grow borderRight>
      <MessageList />
    </Box>
    <Box grow="x9">
      <ChatWindow />
    </Box>
  </>
);
