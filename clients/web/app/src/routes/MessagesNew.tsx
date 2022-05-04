import React from "react";
import { AvatarStack } from "ui/components/AvatarStack";
import { MessageInput } from "@components/MessageInput/MessageInput";
import { Avatar, Box, Divider, Heading, Icon, Paragraph } from "@ui";

export const MessagesNew = () => (
  <Box grow>
    <Box
      borderBottom
      direction="row"
      paddingX="sm"
      height="md"
      gap="xs"
      alignItems="center"
    >
      <Icon type="message" background="level1" />
      <Paragraph size="md">New Message</Paragraph>
    </Box>
    <Box
      borderBottom
      direction="row"
      paddingX="sm"
      height="md"
      gap="xs"
      alignItems="center"
    >
      <Box>
        <Paragraph size="md">To:</Paragraph>
      </Box>
      <Box direction="row">
        <Box
          background="level2"
          gap="xxs"
          direction="row"
          padding="xxs"
          rounded="xs"
          alignItems="center"
        >
          <Avatar circle size="xs" />
          <Paragraph size="sm">godguy23</Paragraph>
        </Box>
      </Box>
    </Box>
    <Box grow gap="sm" justifyContent="end" padding="sm">
      <Box gap="xs">
        <Avatar size="xl" />
        <Heading level={1}>godguy23</Heading>
        <Box direction="row" alignItems="center" gap="xs">
          <Paragraph size="lg" fontWeight="strong">
            50
          </Paragraph>
          <Icon type="token" />
          <Paragraph size="lg" color="gray2">
            &#8226; 3 Servers in common
          </Paragraph>
          <AvatarStack userIds={["1", "2", "3", "4"]} />
        </Box>
        <Paragraph size="md" color="gray2">
          This is the beginning of your direct messa with iamblue
        </Paragraph>
      </Box>
      <Divider />
      <Box gap="sm">
        <MessageInput />
      </Box>
    </Box>
  </Box>
);
