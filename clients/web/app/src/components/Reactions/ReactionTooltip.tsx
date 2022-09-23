import { motion } from "framer-motion";
import React, { useMemo } from "react";
import { firstBy } from "thenby";
import { useMyProfile, useSpaceMembers } from "use-zion-client";
import { notUndefined } from "ui/utils/utils";
import { Box, Paragraph, Text } from "@ui";
import { getNativeEmojiFromName } from "./Reactions";

export const ReactionTootip = ({
  userIds: users,
  reaction,
}: {
  userIds: Map<string, { eventId: string } | undefined>;
  reaction: string;
}) => {
  const names = useNameSequence(users);

  return (
    <MotionBox
      centerContent
      border
      padding="sm"
      background="level2"
      rounded="sm"
      gap="sm"
      maxWidth="200"
      boxShadow="avatar"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2, duration: 0.1 }}
    >
      <Box
        border
        padding
        centerContent
        rounded="sm"
        background="inverted"
        aspectRatio="1/1"
      >
        <Text size="h2">{getNativeEmojiFromName(reaction)}</Text>
      </Box>

      <Paragraph size="sm" textAlign="center" color="default">
        {names}
        <Text as="span" size="sm" textAlign="center" color="gray2">
          reacted with :{reaction}:
        </Text>
      </Paragraph>
    </MotionBox>
  );
};

const MotionBox = motion(Box);

const useNameSequence = (
  users: Map<string, { eventId: string } | undefined>,
) => {
  const { membersMap } = useSpaceMembers();
  const displayName = useMyProfile()?.displayName;

  return useMemo(() => {
    return Array.from(users.keys() ?? [])
      .map((u) => {
        const name = membersMap.get(u)?.name;
        if (!name) {
          return undefined;
        } else if (name === displayName) {
          return "You";
        } else {
          return `${name}`;
        }
      })
      .filter(notUndefined)
      .sort(firstBy((a) => a !== "You"))
      .reduce((str, name, index, arr) => {
        return `${str} ${name}${
          // nothing to add for single names or last name
          arr.length <= 1 || index === arr.length - 1
            ? ``
            : // "and" for next to last
            index === arr.length - 2
            ? `, and `
            : `, `
        }`;
      }, "");
  }, [displayName, membersMap, users]);
};
