import React from "react";
import { Heading, Stack, Tooltip } from "@ui";

export const SpaceNavTooltip = (props: { id: string; name: string }) => {
  const { id, name } = props;
  return (
    <Tooltip padding id={id} key={id}>
      <Stack grow justifyContent="center" gap="sm">
        <Heading level={4}>{name}</Heading>
      </Stack>
    </Tooltip>
  );
};
