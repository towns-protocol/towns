import React from "react";
import { AvatarStack } from "@components/AvatarStack";
import { ChatMessage } from "@components/ChatMessage";
import { MessageInput } from "@components/MessageInput/MessageInput";
import { Avatar, Divider, Heading, Icon, Paragraph } from "@ui";
import { Stack } from "ui/components/Stack/Stack";

export const MessagesRead = () => (
  <Stack grow>
    <Stack
      borderBottom
      horizontal
      paddingX="sm"
      height="md"
      gap="xs"
      alignItems="center"
    >
      <Avatar nft src="/placeholders/nft_4.png" />
      <Paragraph size="lg" color="gray1">
        iamblue
      </Paragraph>
    </Stack>
    <Stack grow gap="sm" justifyContent="end" padding="sm">
      <Stack gap="xs">
        <Avatar nft src="/placeholders/nft_4.png" size="xl" />
        <Heading level={1}>iamblue</Heading>
        <Stack horizontal alignItems="center" gap="xs">
          <Paragraph size="lg" fontWeight="strong">
            50
          </Paragraph>
          <Icon type="token" />
          <Paragraph size="lg" color="gray2">
            &#8226; 3 Servers in common
          </Paragraph>
          <AvatarStack />
        </Stack>

        <Paragraph size="md" color="gray2">
          This is the beginning of your direct messa with iamblue
        </Paragraph>
      </Stack>
      <Divider />
      <Stack gap="sm">
        <ChatMessage
          condensed
          name="You"
          date="Today at 11:01 AM"
          avatar={<Avatar nft src="/placeholders/nft_1.png" />}
        >
          <Paragraph>gm</Paragraph>
        </ChatMessage>
        <ChatMessage
          condensed
          name="iamblue"
          date="Today at 11:01 AM"
          avatar={<Avatar nft src="/placeholders/nft_4.png" />}
        >
          <Paragraph>GM My man!!</Paragraph>
        </ChatMessage>
        <MessageInput />
      </Stack>
    </Stack>
  </Stack>
);
