import React from "react";
import { Avatar, Box, Icon, Paragraph } from "@ui";

export const MessageList = () => {
  return (
    <>
      <Box
        borderBottom
        direction="row"
        paddingX="sm"
        height="md"
        gap="xs"
        alignItems="center"
      >
        <Box grow>
          <Paragraph size="md" color="gray2">
            Messages
          </Paragraph>
        </Box>
        <Box>
          <Icon type="newmessage" background="accent" />
        </Box>
      </Box>
      <Box paddingY="xs">
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
  <Box direction="row" paddingX="sm" paddingY="xs" gap="xs">
    <Avatar nft src="doodles.jpeg" size="lg" />
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
  </Box>
);
