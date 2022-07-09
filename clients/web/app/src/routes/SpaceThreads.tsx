import React from "react";
import { Outlet } from "react-router-dom";
import { Message } from "@components/Message";
import { MessageInput } from "@components/MessageInput/MessageInput";
import { Avatar, Divider, Icon, Paragraph, Stack } from "@ui";
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
            avatar={<Avatar size="avatar_sm" />}
            name="sunsoutapersout"
            date="Today at 11:01AM"
            reactions={{ "👋": 20 }}
          >
            <Paragraph>
              gm! name is francine groves and I'm a big nft fan. I currently
              moderate for Veefriends, Boss Beauties, Fame Ladies, BFF, Flyfish
              Club, Legacy Leaders and All Around Artsy. Soon to add my own
              project to that list.
            </Paragraph>
            <Paragraph>
              I'm a farmer and herbalist (also pagan and ordained), own a
              digital marketing agency and am a musician. Husband and I run a
              YouTube channel about our farm and I'm about to start another
              about marketing and nft's.
            </Paragraph>
          </Message>
          <Paragraph color="accent">Show 150 more replies</Paragraph>
          <Message
            condensed
            avatar={<Avatar size="avatar_sm" src="/placeholders/nft_2.png" />}
            name="deiguy"
            date="Today at 12:01AM"
          >
            <Paragraph>
              Channel about our farm and I'm about to start another about
              marketing and nft's.
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
            <Paragraph>How are you all doing today?</Paragraph>
          </Message>
          <Paragraph color="accent">Show 150 more replies</Paragraph>
          <Message
            condensed
            avatar={<Avatar size="avatar_sm" />}
            name="sunsoutapersout"
            date="Today at 11:01AM"
            reactions={{ "👀": 20, "🤑": 2 }}
          >
            <Paragraph>
              I'm a farmer and herbalist (also pagan and ordained), own a
              digital marketing agency and am a musician. Husband and I run a
              YouTube channel about our farm and I'm about to start another
              about marketing and nft's.
            </Paragraph>
          </Message>

          <Message
            condensed
            avatar={<Avatar size="avatar_sm" src="/placeholders/nft_2.png" />}
            name="deiguy"
            date="Today at 12:01AM"
          >
            <Paragraph>
              Channel about our farm and I'm about to start another about
              marketing and nft's.
            </Paragraph>
          </Message>

          <MessageInput />
        </Stack>
      </Stack>
      <Outlet />
    </Stack>
  );
};
