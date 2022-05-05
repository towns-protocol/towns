import React from "react";
import { NavLink } from "react-router-dom";
import { Reactions } from "@components/Reactions/Reactions";
import { Replies } from "@components/Replies/Replies";
import { Avatar, Box, BoxProps, Stack, Text } from "@ui";

type Props = {
  avatar: string | React.ReactNode;
  name: string;
  condensed?: boolean;
  channel?: string;
  reactions?: { [key: string]: number };
  replies?: { userIds: number[]; fakeLength?: number };
  date: string;
  children?: React.ReactNode;
  rounded?: BoxProps["rounded"];
  padding?: BoxProps["padding"];
  background?: BoxProps["background"];
};

export const Message = ({
  avatar,
  condensed,
  name,
  channel,
  reactions,
  replies,
  date,
  children,
  ...boxProps
}: Props) => (
  <Stack horizontal gap="paragraph" {...boxProps}>
    {/* left / avatar gutter */}
    {/* snippet: center avatar with name row by keeping the size of the containers equal  */}
    <Box centerContent height="height_sm">
      <Box inset="xxs">
        {typeof avatar === "string" ? <Avatar src={avatar} /> : avatar}
      </Box>
    </Box>
    {/* right / main content */}
    <Box grow gap={condensed ? "paragraph" : "md"}>
      {/* name & date top row */}
      <Box direction="row" gap="sm" alignItems="center" height="height_sm">
        {/* display name */}
        <Text
          truncate
          fontSize="md"
          color={name?.match(/\.eth$/) ? "etherum" : "gray1"}
          as="span"
        >
          {name}
        </Text>
        {/* channel */}
        {channel && (
          <NavLink to={channel}>
            <Text fontSize="md" color="accent" as="span">
              #{channel}
            </Text>
          </NavLink>
        )}
        {/* date, alignment tbc depending on context */}
        <Text
          grow={!condensed}
          fontSize="sm"
          color="gray2"
          as="span"
          textAlign="right"
        >
          {date}
        </Text>
      </Box>

      <Box fontSize="md" color="default" maxWidth="1200">
        {children}
      </Box>
      {reactions && (
        <Box direction="row">
          <Reactions reactions={reactions} />
        </Box>
      )}
      {replies && (
        <Box direction="row">
          <Replies replies={replies} />
        </Box>
      )}
    </Box>
  </Stack>
);
