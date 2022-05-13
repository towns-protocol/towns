import React from "react";
import { Avatar, Box, Input } from "@ui";

export const MessageInput = ({
  size = "input_lg",
  onChange,
  onKeyDown,
  value,
}: {
  size?: "input_md" | "input_lg";
  onChange?: React.EventHandler<React.ChangeEvent<HTMLInputElement>>;
  onKeyDown?: React.KeyboardEventHandler<HTMLInputElement>;
  value?: string | number;
}) => (
  <Box grow direction="row">
    <Input
      grow
      placeholder="Type here..."
      icon="plus"
      height={size}
      after={<Avatar size="avatar_xs" />}
      value={value}
      onChange={onChange}
      onKeyDown={onKeyDown}
    />
  </Box>
);
