import React from "react";
import { Outlet } from "react-router";
import { Message } from "@components/Message";
import { MessageInput } from "@components/MessageInput/MessageInput";
import { Avatar, Divider, Icon, Paragraph, Stack } from "@ui";
import { ContextBar } from "@components/ContextBar";

export const SpaceMentions = () => {
  return (
    <Stack grow horizontal>
      <Stack grow>
        <ContextBar
          title="Mentions"
          before={<Icon type="at" size="square_sm" />}
        />
        <Stack padding gap="md">
          <Divider label="# random" align="left" />

          <Paragraph color="accent">Show 2 more replies</Paragraph>
          <Message
            condensed
            avatar={<Avatar size="avatar_sm" src="/placeholders/nft_2.png" />}
            name="deiguy"
            date="Today at 12:01AM"
          >
            <Paragraph>
              Channel about our farm and I'm about to start another about
              marketing and nft's. Something <strong>@msyou209</strong> could
              help out with ?
            </Paragraph>
          </Message>
          <MessageInput />
          <Divider label="# general" align="left" />
          <Message
            condensed
            avatar={<Avatar size="avatar_sm" src="/placeholders/nft_30.png" />}
            name="sunsoutapersout"
            date="Today at 11:01AM"
          >
            <Paragraph>
              Can you sign this today <strong>@msyou209</strong>?
            </Paragraph>
          </Message>

          <MessageInput />
        </Stack>
      </Stack>
      <Outlet />
    </Stack>
  );
};
