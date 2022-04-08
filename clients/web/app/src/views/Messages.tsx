import React from "react";
import { AvatarStack } from "@components/AvatarStack";
import { MainNav, NavContainer } from "@components/MainNav/MainNav";
import { MessageList } from "@components/MessageList";
import { Avatar, Box, Heading, Icon, Paragraph } from "@ui";
import { ChatMessage } from "@components/ChatMessage/ChatMessage";

export const Messages = () => (
  <>
    <MainNav />
    <NavContainer>
      <MessageList />
    </NavContainer>
    <Box grow="x9">
      <Box grow>
        <Box
          borderBottom
          direction="row"
          paddingX="sm"
          height="md"
          gap="xs"
          alignItems="center"
        >
          <Avatar nft src="/placeholders/nft_4.png" />
          <Paragraph size="lg" color="gray1">
            iamblue
          </Paragraph>
        </Box>
        <Box grow justifyContent="end" padding="sm" gap="sm">
          <Box borderBottom gap="sm" paddingBottom="sm">
            <Avatar nft src="/placeholders/nft_4.png" size="xl" />
            <Heading level={1}>iamblue</Heading>

            <Box direction="row" alignItems="center" gap="xs">
              <Paragraph size="lg" fontWeight="strong">
                50
              </Paragraph>
              <Icon type="token" />
              <Paragraph size="lg" color="gray2">
                &#8226; 3 Servers in common
              </Paragraph>

              <AvatarStack />
            </Box>

            <Paragraph size="sm" color="gray2">
              This is the beginning of your direct messa with iamblue
            </Paragraph>
          </Box>
          <Box gap="sm">
            <ChatMessage
              name="You"
              date="Today at 11:01 AM"
              avatar={<Avatar nft src="/placeholders/nft_1.png" />}
            >
              gm
            </ChatMessage>

            <ChatMessage
              name="iamblue"
              date="Today at 11:01 AM"
              avatar={<Avatar nft src="/placeholders/nft_4.png" />}
            >
              gm you
            </ChatMessage>
            <ChatMessage
              name="You"
              date="Today at 11:01 AM"
              avatar={<Avatar nft src="/placeholders/nft_1.png" />}
            >
              gm gm
            </ChatMessage>
          </Box>
        </Box>
      </Box>
    </Box>
  </>
);
