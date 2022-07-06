import React from "react";
import { NavLink } from "react-router-dom";
import { SideBar } from "@components/SideBars/_SideBar";
import { Avatar, Box, ButtonText, Icon, Paragraph, Stack, Text } from "@ui";

export const MessagesSideBar = () => {
  return (
    <SideBar background="default">
      <Stack
        horizontal
        borderBottom
        paddingX="md"
        height="height_xl"
        gap="sm"
        justifyContent="spaceBetween"
        alignItems="center"
      >
        <ButtonText color="default">Messages</ButtonText>
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
      <Stack paddingY="sm">
        <MessageItem />
        <MessageItem />
        <MessageItem />
        <MessageItem />
        <MessageItem />
      </Stack>
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
  <NavLink to="/messages/iamblue">
    <Box paddingX="sm" paddingY="xs">
      <Stack
        horizontal
        rounded="xs"
        gap="sm"
        paddingX="sm"
        height="x6"
        alignItems="center"
        background={selected ? "level3" : undefined}
      >
        <Avatar circle src="/placeholders/nft_2.png" size="avatar_md" />
        <Stack grow gap="sm">
          <ButtonText
            color={active ? "default" : "default"}
            fontWeight={active ? "strong" : "normal"}
          >
            Outer Space
          </ButtonText>
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
