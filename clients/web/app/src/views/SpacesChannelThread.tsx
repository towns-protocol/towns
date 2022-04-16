import React from "react";
import { Avatar, Box, Paragraph, Separator } from "@ui";
import { ChatMessage } from "@components/ChatMessage";
import { MessageInput } from "@components/MessageInput/MessageInput";

export const SpacesChannelThread = (props: { children?: React.ReactNode }) => (
  <Box
    borderRight
    borderLeft
    shrink="x1"
    basis={{ tablet: "auto", desktop: "300" }}
    overflow="hidden"
    minWidth={{ tablet: "none", desktop: "auto" }}
  >
    <Box borderBottom height="md" justifyContent="center" paddingX="sm">
      <Paragraph>Thread</Paragraph>
    </Box>
    <Box padding="sm" gap="sm">
      <Separator align="left" fontSize="md" label="# general" />
      <ChatMessage
        condensed
        name="threadpeep3k"
        date="Today, 11pm"
        avatar={<Avatar nft size="sm" />}
      >
        <Paragraph>This is so nice wher did you find out?</Paragraph>
      </ChatMessage>
      <ChatMessage
        condensed
        name="m00nfLee"
        date="Today, 11:03pm"
        avatar={<Avatar nft size="sm" src="/placeholders/nft_3.png" />}
      >
        <Paragraph>:eyes:</Paragraph>
      </ChatMessage>
      <ChatMessage
        condensed
        name="threadpeep3k"
        date="Today, 11:04pm"
        avatar={<Avatar nft size="sm" src="/placeholders/nft_9.png" />}
      >
        <Paragraph>It's a thread...</Paragraph>
      </ChatMessage>
      <ChatMessage
        condensed
        name="m00nfLee"
        date="Today, 11:03pm"
        avatar={<Avatar nft size="sm" src="/placeholders/nft_3.png" />}
      >
        <Paragraph>what doyou mean?</Paragraph>
      </ChatMessage>
      <ChatMessage
        condensed
        name="m00nfLee"
        date="Today, 11:03pm"
        avatar={<Avatar nft size="sm" src="/placeholders/nft_34.png" />}
      >
        <Paragraph>pls stop</Paragraph>
      </ChatMessage>
      <MessageInput size="md" />
    </Box>
  </Box>
);
