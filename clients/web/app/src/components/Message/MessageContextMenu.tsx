import React from "react";
import { IconButton, Stack } from "@ui";
import { vars } from "ui/styles/vars.css";

type Props = {
  editable?: boolean;
  onEdit?: () => void;
  onOpenThread?: () => void;
};

export const MessageContextMenu = (props: Props) => {
  return (
    <Stack
      horizontal
      border
      gap="md"
      pointerEvents="auto"
      position="absolute"
      background="level2"
      rounded="sm"
      padding="sm"
      width="auto"
      color="gray2"
      style={{
        transform: `translateX(calc(-100% - ${vars.space.sm})) translateY(calc(-100% + 1 * ${vars.space.md}))`,
      }}
    >
      {props.editable && props.onEdit && (
        <IconButton icon="edit" size="square_sm" onClick={props.onEdit} />
      )}
      {props.onOpenThread && (
        <IconButton
          icon="threads"
          size="square_sm"
          onClick={props.onOpenThread}
        />
      )}
    </Stack>
  );
};
