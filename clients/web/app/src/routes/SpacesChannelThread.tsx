import React from "react";
import { Message } from "@components/Message";
import { MessageInput } from "@components/MessageInput/MessageInput";
import { Avatar, Box, Divider, Icon, Paragraph } from "@ui";
import { ContextBar } from "@components/ContextBar";

export const SpacesChannelReplies = (props: { children?: React.ReactNode }) => (
  <Box overflow="hidden" background="default">
    <ContextBar
      after={<Icon type="close" size="square_sm" />}
      title="Replies"
    />
    <Box padding="md" gap="lg">
      <Divider align="left" fontSize="md" label="# general" />
      <Message
        condensed
        name="threadpeep3k"
        date="Today, 11pm"
        avatar={<Avatar size="avatar_sm" />}
      >
        <Paragraph>This is so nice wher did you find out?</Paragraph>
      </Message>
      <Message
        condensed
        name="m00nfLee"
        date="Today, 11:03pm"
        avatar={<Avatar size="avatar_sm" src="/placeholders/nft_3.png" />}
      >
        <Paragraph>:eyes:</Paragraph>
      </Message>
      <Message
        condensed
        name="threadpeep3k"
        date="Today, 11:04pm"
        avatar={<Avatar size="avatar_sm" src="/placeholders/nft_9.png" />}
      >
        <Paragraph>It's a thread...</Paragraph>
      </Message>
      <Message
        condensed
        name="m00nfLee"
        date="Today, 11:03pm"
        avatar={<Avatar size="avatar_sm" src="/placeholders/nft_3.png" />}
      >
        <Paragraph>what doyou mean?</Paragraph>
      </Message>
      <Message
        condensed
        name="m00nfLee"
        date="Today, 11:03pm"
        avatar={<Avatar size="avatar_sm" src="/placeholders/nft_34.png" />}
      >
        <Paragraph>pls stop</Paragraph>
      </Message>
      <MessageInput size="input_md" />
    </Box>
  </Box>
);
