import React from "react";
import { useParams } from "react-router";
import { ChatMessage } from "@components/ChatMessage";
import { Avatar, Box, Paragraph, Separator } from "@ui";

export const SpacesChannel = () => {
  const { channel } = useParams();
  return (
    <Box>
      <Box borderBottom height="md" justifyContent="center" paddingX="sm">
        <Paragraph># {channel}</Paragraph>
      </Box>
      <Box padding gap="sm">
        <ChatMessage
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
            I'm a farmer and herbalist (also pagan and ordained), own a digital
            marketing agency and am a musician. Husband and I run a YouTube
            channel about our farm and I'm about to start another about
            marketing and nft's.
          </Paragraph>
        </ChatMessage>
        <Separator label="Today" />
        <ChatMessage
          avatar={<Avatar nft size="sm" src="/placeholders/nft_30.png" />}
          name="sunsoutapersout"
          date="Today at 11:01AM"
          replies={{ ids: [2, 3, 4], fakeLength: 150 }}
        >
          <Paragraph>How are you all doing today?</Paragraph>
        </ChatMessage>
        <ChatMessage
          avatar={<Avatar nft size="sm" />}
          name="sunsoutapersout"
          date="Today at 11:01AM"
          reactions={{ "👀": 20, "🤑": 2 }}
        >
          <Paragraph>
            I'm a farmer and herbalist (also pagan and ordained), own a digital
            marketing agency and am a musician. Husband and I run a YouTube
            channel about our farm and I'm about to start another about
            marketing and nft's.
          </Paragraph>
        </ChatMessage>
        <ChatMessage
          avatar={<Avatar nft size="sm" src="/placeholders/nft_2.png" />}
          name="deiguy"
          date="Today at 12:01AM"
        >
          <Paragraph>
            Channel about our farm and I'm about to start another about
            marketing and nft's.
          </Paragraph>
        </ChatMessage>
        <ChatMessage
          avatar={<Avatar nft size="sm" src="/placeholders/nft_28.png" />}
          name="deiguy"
          date="Today at 12:01AM"
        >
          <Paragraph>Nope!</Paragraph>
        </ChatMessage>
        <ChatMessage
          avatar={<Avatar nft size="sm" src="/placeholders/nft_2.png" />}
          name="deiguy"
          date="Today at 12:01AM"
        >
          <Paragraph>Nope!</Paragraph>
        </ChatMessage>
        <ChatMessage
          avatar={<Avatar nft size="sm" src="/placeholders/nft_39.png" />}
          name="deiguy"
          date="Today at 12:01AM"
        >
          <Paragraph>Nope!</Paragraph>
        </ChatMessage>
        <ChatMessage
          avatar={<Avatar nft size="sm" src="/placeholders/nft_2.png" />}
          name="deiguy"
          date="Today at 12:01AM"
        >
          <Paragraph>
            Yes arm and I'm about to start another about marketing
          </Paragraph>
        </ChatMessage>
      </Box>
    </Box>
  );
};
