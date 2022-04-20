import React from "react";
import { Outlet } from "react-router";
import { ChatMessage } from "@components/ChatMessage";
import { MessageInput } from "@components/MessageInput/MessageInput";
import { Avatar, Divider, Icon, Paragraph, Stack } from "@ui";

export const SpaceThreads = () => {
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
          <Icon type="message" size="sm" />
          <Paragraph size="lg">Threads</Paragraph>
        </Stack>
        <Stack padding gap="sm">
          <Divider label="# general" align="left" />
          <ChatMessage
            condensed
            avatar={<Avatar nft size="sm" />}
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
          </ChatMessage>
          <Paragraph color="accent">Show 150 more replies</Paragraph>
          <ChatMessage
            condensed
            avatar={<Avatar nft size="sm" src="/placeholders/nft_2.png" />}
            name="deiguy"
            date="Today at 12:01AM"
          >
            <Paragraph>
              Channel about our farm and I'm about to start another about
              marketing and nft's.
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
            <Paragraph>How are you all doing today?</Paragraph>
          </ChatMessage>
          <Paragraph color="accent">Show 150 more replies</Paragraph>
          <ChatMessage
            condensed
            avatar={<Avatar nft size="sm" />}
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
          </ChatMessage>

          <ChatMessage
            condensed
            avatar={<Avatar nft size="sm" src="/placeholders/nft_2.png" />}
            name="deiguy"
            date="Today at 12:01AM"
          >
            <Paragraph>
              Channel about our farm and I'm about to start another about
              marketing and nft's.
            </Paragraph>
          </ChatMessage>

          <MessageInput />
        </Stack>
      </Stack>
      <Outlet />
    </Stack>
  );
};
