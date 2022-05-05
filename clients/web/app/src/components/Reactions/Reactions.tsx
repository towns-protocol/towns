import React from "react";
import { Stack, Text } from "@ui";

export const Reactions = (props: { reactions: { [key: string]: number } }) => {
  const { reactions } = props;
  const emojis = reactions && Object.keys(reactions);
  if (!emojis?.length) return <></>;
  return (
    <Stack direction="row" gap="xs">
      {emojis.map((k) => (
        <Stack
          horizontal
          centerContent
          key={k}
          gap="sm"
          rounded="lg"
          height="height_md"
          background="level2"
          color="gray1"
          paddingX="sm"
        >
          <Text size="sm">{k}</Text>
          <Text size="sm">{reactions[k]}</Text>
        </Stack>
      ))}
    </Stack>
  );
};
