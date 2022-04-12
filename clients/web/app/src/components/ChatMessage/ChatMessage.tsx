import clsx from "clsx";
import React from "react";
import { Avatar, Box, BoxProps, Text } from "@ui";
import * as styles from "./ChatMessage.css";

type Props = {
  avatar: React.ReactNode;
  name: string;

  channel?: string;
  reactions?: { [key: string]: number };
  replies?: { ids: number[]; fakeLength: number };
  date: string;
  children?: React.ReactNode;
  rounded?: BoxProps["rounded"];
  padding?: BoxProps["padding"];
  background?: BoxProps["background"];
};

export const ChatMessage = ({
  avatar,
  name,
  channel,
  reactions,
  replies,
  date,
  children,
  ...boxProps
}: Props) => (
  <Box direction="row" gap="sm" {...boxProps}>
    {/* left / avatar gutter */}
    {/* snippet: center avatar with name row by keeping the size of the containers equal  */}
    <Box centerContent height="xxs">
      <Box inset="xxs">{avatar}</Box>
    </Box>
    {/* right / main content */}
    <Box grow gap="sm">
      {/* name & date top row */}
      <Box direction="row" gap="xs" alignItems="center" height="xxs">
        {/* display name */}
        <Text
          truncate
          fontSize="md"
          color={name.match(/\.eth$/) ? "etherum" : "gray1"}
          as="span"
        >
          {name}
        </Text>
        {/* channel */}
        {channel && (
          <Text fontSize="md" color="accent" as="span">
            {channel}
          </Text>
        )}
        {/* date, alignment tbc depending on context */}
        <Text grow fontSize="sm" color="gray2" as="span" textAlign="right">
          {date}
        </Text>
      </Box>

      <Box
        fontSize="lg"
        className={clsx(styles.MessageBody)}
        color="default"
        maxWidth="1200"
      >
        {children}
      </Box>
      {reactions && (
        <Box direction="row">
          <ReactionMock reactions={reactions} />
        </Box>
      )}
      {replies && (
        <Box direction="row">
          <RepliesMock replies={replies} />
        </Box>
      )}
    </Box>
  </Box>
);

const ReactionMock = (props: { reactions: { [key: string]: number } }) => (
  <Box direction="row" gap="xxs">
    {Object.keys(props.reactions).map((k) => (
      <Box
        centerContent
        key={k}
        rounded="lg"
        height="sm"
        background="level2"
        paddingX="xs"
      >
        <Text as="span" size="sm" color="gray1">
          {k} {props.reactions[k]}
        </Text>
      </Box>
    ))}
  </Box>
);

const RepliesMock = (props: {
  replies: { ids: number[]; fakeLength: number };
}) => (
  <Box
    centerContent
    rounded="xs"
    height="sm"
    background="level2"
    paddingX="xs"
    direction="row"
    gap="xxs"
  >
    {props.replies.ids.map((id) => (
      <Avatar circle src={`/placeholders/nft_${id}.png`} size="xs" />
    ))}
    <Text as="span" size="sm" color="gray1">
      {props.replies.fakeLength} replies
    </Text>
  </Box>
);
