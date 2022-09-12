import React from "react";
import { Outlet } from "react-router";
import { Message } from "@components/Message";
import { MessageInput } from "@components/MessageInput/MessageInput";
import { Divider, Icon, Paragraph, Stack } from "@ui";
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
            avatar="/placeholders/nft_2.png"
            avatarSize="avatar_sm"
            name="deiguy"
            timestamp={Date.now() - 3600000 * 4}
          >
            <Paragraph>
              Channel about our farm and I&apos;m about to start another about
              marketing and nft&apos;s. Something <strong>@msyou209</strong>{" "}
              could help out with ?
            </Paragraph>
          </Message>
          <MessageInput />
          <Divider label="# general" align="left" />
          <Message
            condensed
            avatar="/placeholders/nft_30.png"
            avatarSize="avatar_sm"
            name="sunsoutapersout"
            timestamp={Date.now() - 3600000 * 3}
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
