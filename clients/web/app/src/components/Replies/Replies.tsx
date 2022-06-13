import React from "react";
import { NavLink } from "react-router-dom";
import { Avatar, Box, Text } from "@ui";

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
      <Box
        centerContent
        rounded="xs"
        height="x4"
        background="level3"
        paddingX="sm"
        direction="row"
        gap="line"
      >
        {replies.userIds.map((id) => (
          <Avatar
            circle
            key={id}
            src={`/placeholders/nft_${id}.png`}
            size="avatar_xs"
          />
        ))}
        <Text as="span" size="sm" color="gray1">
          {numReplies} {numReplies > 1 ? "replies" : "reply"}
        </Text>
      </Box>
    </NavLink>
  );
};
