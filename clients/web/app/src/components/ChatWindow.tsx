import React from "react";
import { Box, Heading, Icon, Paragraph, Text } from "@ui";
import { Avatar } from "ui/components/Avatar/Avatar";
import { AvatarStack } from "./AvatarStack";

export const ChatWindow = () => (
  <Box grow>
    <Box
      borderBottom
      direction="row"
      paddingX="sm"
      height="lg"
      gap="xs"
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

        <Box direction="row" alignItems="center" gap="xs">
          <Paragraph size="xl" fontWeight="strong">
            50
          </Paragraph>
          <Icon type="token" />
          <Paragraph size="xl" color="muted1">
            &#8226; 3 Servers in common
          </Paragraph>

          <AvatarStack />
        </Box>

        <Paragraph size="sm" color="muted1">
          This is the beginning of your direct messa with iamblue
        </Paragraph>
      </Box>
      <Box gap="sm">
        <ChatRow avatar={<Avatar nft src="doodles.jpeg" />}>gm</ChatRow>
        <ChatRow avatar={<Avatar nft src="ape.webp" />}>gm you</ChatRow>
        <ChatRow avatar={<Avatar nft src="doodles.jpeg" />}>gm gm</ChatRow>
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
        <Text size="sm" color="muted1">
          Today at 11:01 AM
        </Text>
      </Box>
      <Box>
        <Text fontSize="md" color="muted">
          {props.children}
        </Text>
      </Box>
    </Box>
  </Box>
);
