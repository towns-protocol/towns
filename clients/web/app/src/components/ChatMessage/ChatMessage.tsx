import React from "react";
import { Box, BoxProps, Text } from "@ui";
import * as styles from "./ChatMessage.css";

type Props = {
  avatar: React.ReactNode;
  name: string;
  channel?: string;
  reactions?: { [key: string]: number };
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
  date,
  children,
  ...boxProps
}: Props) => (
  <Box direction="row" gap="sm" {...boxProps}>
    {/* left / avatar gutter */}
    {/* snippet: center avatar with name row by keeping the size of the containers equal  */}
    <Box border centerContent height="xs">
      <Box negativeMargin="xs">{avatar}</Box>
    </Box>
    {/* right / main content */}
    <Box gap="xs">
      {/* name & date top row */}
      <Box direction="row" height="xs" gap="xs" alignItems="center">
        {/* display name */}
        <Text fontSize="md" color="gray1" as="span">
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

      <Box fontSize="lg" className={styles.MessageBody} color="default">
        {children}
      </Box>
      {reactions && (
        <Box direction="row">
          <ReactionMock reactions={reactions} />
        </Box>
      )}
    </Box>
  </Box>
);

const ReactionMock = (props: { reactions: { [key: string]: number } }) => (
  <Box centerContent rounded="md" height="xs" background="level2" paddingX="xs">
    {Object.keys(props.reactions).map((k) => (
      <Text as="span" size="sm" color="gray2" fontWeight="strong">
        {k} {props.reactions[k]}
      </Text>
    ))}
  </Box>
);
