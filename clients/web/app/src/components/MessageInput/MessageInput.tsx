import React from "react";
import { Avatar, Box, Icon, Input } from "@ui";

export const MessageInput = () => (
  <Box grow direction="row">
    <Input
      grow
      placeholder="Type here..."
      icon="plus"
      height="lg"
      after={<Avatar size="xs" />}
    />
  </Box>
);
