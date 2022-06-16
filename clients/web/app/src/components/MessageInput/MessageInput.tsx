import React from "react";
import { Avatar, Stack, TextField } from "@ui";

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
  <Stack grow horizontal>
    <TextField
      background="level1"
      placeholder="Type here..."
      icon="plus"
      height={size}
      after={<Avatar circle src="/placeholders/nft_10.png" size="avatar_md" />}
      onChange={onChange}
      onKeyDown={onKeyDown}
    />
  </Stack>
);
