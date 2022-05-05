import React from "react";
import { Avatar, Box, Input } from "@ui";

export const MessageInput = ({
  size = "input_lg",
}: {
  size?: "input_md" | "input_lg";
}) => (
  <Box grow direction="row">
    <Input
      grow
      placeholder="Type here..."
      icon="plus"
      height={size}
      after={<Avatar size="avatar_xs" />}
    />
  </Box>
);
