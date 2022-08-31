import { EmojiData } from "emoji-mart";
import React from "react";
import { EmojiPickerButton } from "@components/EmojiPickerButton";
import { IconButton, Stack } from "@ui";

export const RichTextEditorControls = (props: {
  typeToggled: boolean;
  onToggleType: () => void;
  onSelectEmoji: (data: EmojiData) => void;
}) => {
  return (
    <Stack horizontal gap="sm" color="gray2" alignItems="end" height="100%">
      <EmojiPickerButton onSelectEmoji={props.onSelectEmoji} />
      <IconButton
        icon="type"
        active={props.typeToggled}
        onClick={props.onToggleType}
      />
    </Stack>
  );
};
