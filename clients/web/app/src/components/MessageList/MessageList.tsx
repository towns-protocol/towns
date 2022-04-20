import React from "react";
import { NavLink } from "react-router-dom";
import { Avatar, Box, Icon, Paragraph, Stack } from "@ui";

export const MessageList = () => {
  return (
    <>
      <Stack
        horizontal
        borderBottom
        paddingX="sm"
        height="md"
        gap="xs"
        justifyContent="spaceBetween"
        alignItems="center"
      >
        <Paragraph>Messages</Paragraph>
        <Box>
          <NavLink to="/messages/new">
            <Icon type="newmessage" background="accent" />
          </NavLink>
        </Box>
      </Stack>
      <Box>
        <Message />
        <Message />
        <Message />
        <Message />
        <Message />
      </Box>
    </>
  );
};

const Message = ({
  active,
  selected,
}: {
  active?: boolean;
  selected?: boolean;
}) => (
  <NavLink to="iamblue">
    <Stack horizontal paddingX="sm" paddingY="xs" gap="xs">
      <Avatar nft src="/placeholders/nft_2.png" size="lg" insetY="xxs" />
      <Box grow gap="xxs">
        <Paragraph
          color={active ? "default" : "gray1"}
          fontWeight={active ? "strong" : "normal"}
        >
          Outer Space
        </Paragraph>
        <Paragraph size="md" color="gray2">
          Lomo
        </Paragraph>
      </Box>
      <Box centerContent shrink>
        <Paragraph color="gray2">1m</Paragraph>
      </Box>
    </Stack>
  </NavLink>
);
