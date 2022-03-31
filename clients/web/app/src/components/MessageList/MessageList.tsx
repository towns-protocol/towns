import { Avatar, Box, Icon, Paragraph } from "@ui";
import React from "react";

export const MessageList = () => {
  return (
    <>
      <Box
        direction="row"
        paddingX="sm"
        height="lg"
        gap="xs"
        borderBottom
        alignItems="center"
      >
        <Box grow>
          <Paragraph size="lg" color="muted2">
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
    <Avatar src={"doodles.jpeg"} nft size="lg" />
    <Box gap="xxs" grow>
      <Paragraph
        color={active ? "default" : "muted"}
        fontWeight={active ? "strong" : "normal"}
      >
        Outer Space
      </Paragraph>
      <Paragraph size="md" color="muted2">
        Lomo
      </Paragraph>
    </Box>
    <Box centerContent shrink>
      <Paragraph color="muted2">1m</Paragraph>
    </Box>
  </Box>
);
