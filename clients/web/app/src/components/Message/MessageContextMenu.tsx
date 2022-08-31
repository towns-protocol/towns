import { EmojiData } from "emoji-mart";
import React from "react";
import useEvent from "react-use-event-hook";
import { IconButton, Stack } from "@ui";
import { EmojiPickerButton } from "@components/EmojiPickerButton";
import { vars } from "ui/styles/vars.css";

type Props = {
  onEdit?: () => void;
  onOpenThread?: () => void;
  onSelectReaction?: (data: EmojiData) => void;
};

const style = {
  transform: `
    translateY(calc(-50% - ${vars.space.md}))
  `,
};

export const MessageContextMenu = (props: Props) => {
  const onSelectEmoji = useEvent((data: EmojiData) => {
    console.log(`react to message with`, data);
  });
  return (
    <Stack
      horizontal
      border
      gap="xs"
      pointerEvents="auto"
      position="topRight"
      background="level1"
      rounded="sm"
      padding="xs"
      width="auto"
      color="gray2"
      style={style}
    >
      {props.onEdit && (
        <IconButton icon="edit" size="square_sm" onClick={props.onEdit} />
      )}
      {props.onOpenThread && (
        <IconButton
          icon="threads"
          size="square_sm"
          onClick={props.onOpenThread}
        />
      )}
      <EmojiPickerButton onSelectEmoji={onSelectEmoji} />
    </Stack>
  );
};
