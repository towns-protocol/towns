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
        paddingX="sm"
        height="x7"
        gap="xs"
        justifyContent="spaceBetween"
        alignItems="center"
      >
        <Paragraph color="default">Messages</Paragraph>
        <Box>
          <NavLink to="/messages/new">
            <Icon
              type="newmessage"
              background="inverted"
              size="lg"
              padding="xs"
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
    <Box paddingX="xs" paddingY="xxs">
      <Stack
        horizontal
        rounded="xs"
        gap="xs"
        paddingX="xs"
        paddingY="sm"
        background={selected ? "level2" : undefined}
      >
        <Avatar nft src="/placeholders/nft_2.png" size="lg" />
        <Stack grow gap="xs">
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
