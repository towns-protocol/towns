import React from "react";
import { NavLink } from "react-router-dom";
import { Avatar, Stack, Text } from "@ui";

export const Replies = ({
  replies,
  link = "/spaces/crypto-punks/announcements/replies/123123123",
  ...props
}: {
  replies: { userIds: number[]; fakeLength?: number };
  link?: string;
}) => {
  const numReplies = replies.fakeLength ?? replies.userIds.length;

  return (
    <NavLink to={link}>
      <Stack
        horizontal
        border
        alignItems="center"
        rounded="xs"
        background="level3"
        padding="sm"
        gap="line"
      >
        {replies.userIds.map((id) => (
          <Avatar
            circle
            key={id}
            src={`/placeholders/nft_${id}.png`}
            size="avatar_sm"
          />
        ))}
        <Text as="span">
          {numReplies} {numReplies > 1 ? "replies" : "reply"}
        </Text>
      </Stack>
    </NavLink>
  );
};
