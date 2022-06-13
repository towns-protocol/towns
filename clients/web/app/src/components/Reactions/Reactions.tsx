import React from "react";
import { Stack, Text } from "@ui";

export const Reactions = (props: {
  reactions: { [key: string]: number };
  userReaction?: string;
}) => {
  const { reactions } = props;
  const emojis = reactions && Object.keys(reactions);
  if (!emojis?.length) return <></>;
  return (
    <Stack direction="row" gap="sm" height="x3">
      {emojis.map((k) => (
        <Stack
          horizontal
          centerContent
          key={k}
          gap="sm"
          rounded="lg"
          background="level3"
          color="gray1"
          paddingX="sm"
          border={props.userReaction === k}
        >
          <Text size="sm">{k}</Text>
          <Text size="sm">{reactions[k]}</Text>
        </Stack>
      ))}
    </Stack>
  );
};
