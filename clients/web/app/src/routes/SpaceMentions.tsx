import React from "react";
import { Outlet } from "react-router";
import { ChatMessage } from "@components/ChatMessage";
import { MessageInput } from "@components/MessageInput/MessageInput";
import { Avatar, Divider, Icon, Paragraph, Stack } from "@ui";

export const SpaceMentions = () => {
  return (
    <Stack grow horizontal>
      <Stack grow>
        <Stack
          horizontal
          borderBottom
          height="md"
          alignItems="center"
          paddingX="sm"
          gap="xs"
        >
          <Icon type="at" size="sm" />
          <Paragraph size="lg">Mentions</Paragraph>
        </Stack>
        <Stack padding gap="sm">
          <Divider label="# random" align="left" />

          <Paragraph color="accent">Show 2 more replies</Paragraph>
          <ChatMessage
            condensed
            avatar={<Avatar nft size="sm" src="/placeholders/nft_2.png" />}
            name="deiguy"
            date="Today at 12:01AM"
          >
            <Paragraph>
              Channel about our farm and I'm about to start another about
              marketing and nft's. Something <strong>@msyou209</strong> could
              help out with ?
            </Paragraph>
          </ChatMessage>
          <MessageInput />
          <Divider label="# general" align="left" />
          <ChatMessage
            condensed
            avatar={<Avatar nft size="sm" src="/placeholders/nft_30.png" />}
            name="sunsoutapersout"
            date="Today at 11:01AM"
          >
            <Paragraph>
              Can you sign this today <strong>@msyou209</strong>?
            </Paragraph>
          </ChatMessage>

          <MessageInput />
        </Stack>
      </Stack>
      <Outlet />
    </Stack>
  );
};
