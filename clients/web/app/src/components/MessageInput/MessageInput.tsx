import React from "react";
import { Avatar, Box, Icon, Input } from "@ui";

export const MessageInput = () => (
  <Box grow direction="row">
    <Input
      grow
      before={<Icon type="plus" size="xs" background="level3" />}
      after={<Avatar size="xs" />}
    />
  </Box>
);
