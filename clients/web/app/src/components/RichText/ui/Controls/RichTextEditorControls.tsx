import React from "react";
import { IconButton, Stack } from "@ui";

export const RichTextEditorControls = (props: {
  typeToggled: boolean;
  onToggleType: () => void;
}) => {
  return (
    <Stack horizontal gap color="gray2" alignItems="end" height="100%">
      <IconButton icon="emoji" />
      <IconButton
        icon="type"
        active={props.typeToggled}
        onClick={props.onToggleType}
      />
    </Stack>
  );
};
