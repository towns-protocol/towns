import React from "react";
import { Message } from "@components/Message";
import { MessageInput } from "@components/MessageInput/MessageInput";
import { UserInfo } from "@components/UserInfo/UserInfo";
import { Avatar, Divider, Paragraph } from "@ui";
import { Stack } from "ui/components/Stack/Stack";
import { ContextBar } from "@components/ContextBar";

export const MessagesRead = () => (
  <Stack grow>
    <ContextBar>
      <Avatar nft src="/placeholders/nft_4.png" size="lg" />
      <Paragraph size="lg" color="default">
        iamblue
      </Paragraph>
    </ContextBar>
    <Stack grow gap="sm" justifyContent="end" padding="sm">
      <Stack gap="xs">
        <UserInfo userId="3" />
        <Paragraph size="md" color="gray2">
          This is the beginning of your direct messa with iamblue
        </Paragraph>
      </Stack>
      <Divider />
      <Stack gap="sm">
        <Message
          condensed
          name="You"
          date="Today at 11:01 AM"
          avatar={<Avatar nft src="/placeholders/nft_1.png" />}
        >
          <Paragraph>gm</Paragraph>
        </Message>
        <Message
          condensed
          name="iamblue"
          date="Today at 11:01 AM"
          avatar={<Avatar nft src="/placeholders/nft_4.png" />}
        >
          <Paragraph>GM My man!!</Paragraph>
        </Message>
        <MessageInput />
      </Stack>
    </Stack>
  </Stack>
);
