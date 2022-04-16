import React from "react";
import { Avatar, Box, Input } from "@ui";

export const MessageInput = ({ size = "lg" }: { size?: "md" | "lg" }) => (
  <Box grow direction="row">
    <Input
      grow
      placeholder="Type here..."
      icon="plus"
      height={size}
      after={<Avatar size="xs" />}
    />
  </Box>
);
