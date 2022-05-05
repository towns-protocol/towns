import React from "react";
import { NavLink } from "react-router-dom";
import { Avatar, Box, Icon, Paragraph, Stack, Text } from "@ui";
import { SideBar } from "@components/SideBars/_SideBar";

export const MessagesSideBar = () => {
  return (
    <SideBar>
      <Stack
        horizontal
        borderBottom
        paddingX="md"
        height="x7"
        gap="sm"
        justifyContent="spaceBetween"
        alignItems="center"
      >
        <Paragraph color="default">Messages</Paragraph>
        <Box>
          <NavLink to="/messages/new">
            <Icon
              type="newmessage"
              background="inverted"
              size="square_lg"
              padding="sm"
            />
          </NavLink>
        </Box>
      </Stack>
      <Box>
        <MessageItem />
        <MessageItem />
        <MessageItem />
        <MessageItem />
        <MessageItem />
      </Box>
    </SideBar>
  );
};

const MessageItem = ({
  active,
  selected,
}: {
  active?: boolean;
  selected?: boolean;
}) => (
  <NavLink to="iamblue">
    <Box paddingX="sm" paddingY="xs">
      <Stack
        horizontal
        rounded="xs"
        gap="sm"
        paddingX="sm"
        paddingY="md"
        background={selected ? "level2" : undefined}
      >
        <Avatar src="/placeholders/nft_2.png" size="avatar_lg" />
        <Stack grow gap="sm">
          <Text
            color={active ? "default" : "default"}
            fontWeight={active ? "strong" : "normal"}
          >
            Outer Space
          </Text>
          <Text size="md" color="gray2">
            Lomo
          </Text>
        </Stack>
        <Box centerContent shrink>
          <Paragraph color="gray2">1m</Paragraph>
        </Box>
      </Stack>
    </Box>
  </NavLink>
);
