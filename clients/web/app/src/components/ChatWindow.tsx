import { Box, Heading, Paragraph, Text } from "@ui";
import React from "react";
import { Avatar } from "ui/components/Avatar/Avatar";

export const ChatWindow = () => (
  <Box grow>
    <Box
      height="md"
      direction="row"
      alignItems="center"
      borderBottom
      paddingX="sm"
      gap="xs"
    >
      <Avatar nft src="doodles.jpeg" />
      <Text size="md" color="muted1">
        iamblue
      </Text>
    </Box>
    <Box grow justifyContent="end" padding="sm" gap="sm">
      <Box borderBottom gap="sm" paddingBottom="sm">
        <Avatar nft src="doodles.jpeg" size="lg" />
        <Heading level={1}>iamblue</Heading>
        <Paragraph size="xs" color="muted3">
          This is the beginning of your direct messa with iamblue
        </Paragraph>
      </Box>
      <Box gap="sm">
        <ChatRow avatar={<Avatar src="doodles.jpeg" nft />}>gm</ChatRow>
        <ChatRow avatar={<Avatar src="ape.webp" nft />}>gm you</ChatRow>
        <ChatRow avatar={<Avatar src="doodles.jpeg" nft />}>gm gm</ChatRow>
      </Box>
    </Box>
  </Box>
);

const ChatRow = (props: {
  avatar: React.ReactNode;
  children: React.ReactText;
}) => (
  <Box direction="row" gap="xs">
    {props.avatar}
    <Box>
      <Box direction="row" gap="xs" alignItems="baseline">
        <Text fontSize="sm" color="muted2">
          iamblue
        </Text>
        <Text size="xxs" color="muted3">
          Today at 11:01 AM
        </Text>
      </Box>
      <Box>
        <Text fontSize="sm" color="muted1">
          {props.children}
        </Text>
      </Box>
    </Box>
  </Box>
);
