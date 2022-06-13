import React from "react";
import { AvatarStack } from "ui/components/AvatarStack";
import { MessageInput } from "@components/MessageInput/MessageInput";
import { Avatar, Box, Divider, Heading, Icon, Paragraph, Stack } from "@ui";
import { ContextBar } from "@components/ContextBar";

export const MessagesNew = () => (
  <Stack grow>
    <ContextBar
      title="New Message"
      before={<Icon type="message" background="level2" />}
    />
    <ContextBar>
      <Paragraph size="md">To:</Paragraph>
      <Box
        background="level3"
        gap="xs"
        direction="row"
        padding="xs"
        rounded="xs"
        alignItems="center"
      >
        <Avatar circle size="avatar_xs" />
        <Paragraph size="sm">godguy23</Paragraph>
      </Box>
    </ContextBar>

    <Box grow gap="md" justifyContent="end" padding="md">
      <Box gap="sm">
        <Avatar size="avatar_xl" />
        <Heading level={1}>godguy23</Heading>
        <Box direction="row" alignItems="center" gap="sm">
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
      <Box gap="md">
        <MessageInput />
      </Box>
    </Box>
  </Stack>
);
