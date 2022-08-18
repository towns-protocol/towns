import React from "react";
import { Stack, Text, Tooltip } from "@ui";

export const SpaceNavTooltip = (props: { id: string; name: string }) => {
  const { id, name } = props;
  return (
    <Tooltip padding id={id} key={id}>
      <Stack grow justifyContent="center" gap="sm">
        <Text strong>{name}</Text>
      </Stack>
    </Tooltip>
  );
};
