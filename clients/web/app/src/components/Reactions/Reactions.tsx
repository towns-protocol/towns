import React from "react";
import { Stack, Text } from "@ui";

export const Reactions = (props: { reactions: { [key: string]: number } }) => {
  const { reactions } = props;
  const emojis = reactions && Object.keys(reactions);
  if (!emojis?.length) return <></>;
  return (
    <Stack direction="row" gap="xxs">
      {emojis.map((k) => (
        <Stack
          horizontal
          centerContent
          key={k}
          gap="xs"
          rounded="lg"
          height="sm"
          background="level2"
          color="gray1"
          paddingX="xs"
        >
          <Text size="sm">{k}</Text>
          <Text size="sm">{reactions[k]}</Text>
        </Stack>
      ))}
    </Stack>
  );
};
