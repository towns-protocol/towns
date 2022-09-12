import React from "react";
import { Outlet } from "react-router";
import { Message } from "@components/Message";
import { MessageInput } from "@components/MessageInput/MessageInput";
import { Divider, Icon, Paragraph, Stack } from "@ui";
import { ContextBar } from "@components/ContextBar";

export const SpaceThreads = () => {
  return (
    <Stack grow horizontal>
      <Stack grow>
        <ContextBar
          title="Threads"
          before={<Icon type="message" size="square_sm" />}
        />
        <Stack padding gap="md">
          <Divider label="# general" align="left" />
          <Message
            condensed
            avatar=""
            avatarSize="avatar_sm"
            name="sunsoutapersout"
            timestamp={Date.now() - 3600000 * 3}
            reactions={new Map([["waving_hand", new Set(["a", "b", "c"])]])}
          >
            <Paragraph>
              gm! name is francine groves and I&apos;m a big nft fan. I
              currently moderate for Veefriends, Boss Beauties, Fame Ladies,
              BFF, Flyfish Club, Legacy Leaders and All Around Artsy. Soon to
              add my own project to that list.
            </Paragraph>
            <Paragraph>
              I&apos;m a farmer and herbalist (also pagan and ordained), own a
              digital marketing agency and am a musician. Husband and I run a
              YouTube channel about our farm and I&apos;m about to start another
              about marketing and nft&apos;s.
            </Paragraph>
          </Message>
          <Paragraph color="accent">Show 150 more replies</Paragraph>
          <Message
            condensed
            avatar="/placeholders/nft_2.png"
            avatarSize="avatar_sm"
            name="deiguy"
            timestamp={Date.now() - 3600000 * 3}
          >
            <Paragraph>
              Channel about our farm and I&apos;m about to start another about
              marketing and nft&apos;s.
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
            <Paragraph>How are you all doing today?</Paragraph>
          </Message>
          <Paragraph color="accent">Show 150 more replies</Paragraph>
          <Message
            condensed
            avatar=""
            avatarSize="avatar_sm"
            name="sunsoutapersout"
            timestamp={Date.now() - 3600000 * 3}
            reactions={
              new Map([
                ["eyes", new Set(["a"])],
                ["waving_hand", new Set(["a", "b", "c"])],
              ])
            }
          >
            <Paragraph>
              I&apos;m a farmer and herbalist (also pagan and ordained), own a
              digital marketing agency and am a musician. Husband and I run a
              YouTube channel about our farm and I&apos;m about to start another
              about marketing and nft&apos;s.
            </Paragraph>
          </Message>

          <Message
            condensed
            avatar="placeholders/nft_2.png"
            avatarSize="avatar_sm"
            name="deiguy"
            timestamp={Date.now() - 3600000 * 3}
          >
            <Paragraph>
              Channel about our farm and I&apos;m about to start another about
              marketing and nft&apos;s.
            </Paragraph>
          </Message>

          <MessageInput />
        </Stack>
      </Stack>
      <Outlet />
    </Stack>
  );
};
