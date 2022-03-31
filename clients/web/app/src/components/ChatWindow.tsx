import { Box, Heading, Icon, Paragraph, Text } from "@ui";
import React from "react";
import { Avatar } from "ui/components/Avatar/Avatar";

export const ChatWindow = () => (
  <Box grow>
    <Box
      direction="row"
      paddingX="sm"
      height="lg"
      gap="xs"
      borderBottom
      alignItems="center"
    >
      <Avatar nft src="doodles.jpeg" />
      <Paragraph size="lg" color="muted">
        iamblue
      </Paragraph>
    </Box>
    <Box grow justifyContent="end" padding="sm" gap="sm">
      <Box borderBottom gap="sm" paddingBottom="sm">
        <Avatar nft src="doodles.jpeg" size="xl" />
        <Heading level={1}>iamblue</Heading>
        <Box direction="row" alignItems="center" gap="xxs">
          <Paragraph size="xl" fontWeight="strong">
            50
          </Paragraph>
          <Icon type="token" />
          <Paragraph size="xl" color="muted2">
            &#8226; 3 Servers in common
          </Paragraph>
        </Box>
        <Paragraph size="sm" color="muted2">
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
        <Text fontSize="md" color="muted">
          iamblue
        </Text>
        <Text size="sm" color="muted2">
          Today at 11:01 AM
        </Text>
      </Box>
      <Box>
        <Text fontSize="md" color="muted1">
          {props.children}
        </Text>
      </Box>
    </Box>
  </Box>
);
