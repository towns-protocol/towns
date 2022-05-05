import React from "react";
import { Outlet, useParams } from "react-router";
import { Message } from "@components/Message";
import { Avatar, Box, Divider, Paragraph } from "@ui";
import { MessageInput } from "@components/MessageInput/MessageInput";
import { ContextBar } from "@components/ContextBar";

export const SpacesChannel = () => {
  const { channel } = useParams();
  return (
    <Box grow direction="row">
      <Box grow>
        <ContextBar>
          <Paragraph size="lg"># {channel}</Paragraph>
        </ContextBar>
        <Box padding gap="lg">
          <Message
            condensed
            avatar={<Avatar size="avatar_sm" />}
            name="sunsoutapersout"
            date="Today at 11:01AM"
            reactions={{ "👋": 20 }}
          >
            <p>
              gm! name is francine groves and I'm a big nft fan. I currently
              moderate for Veefriends, Boss Beauties, Fame Ladies, BFF, Flyfish
              Club, Legacy Leaders and All Around Artsy. Soon to add my own
              project to that list.
            </p>
            <p>
              I'm a farmer and herbalist (also pagan and ordained), own a
              digital marketing agency and am a musician. Husband and I run a
              YouTube channel about our farm and I'm about to start another
              about marketing and nft's.
            </p>
          </Message>
          <Divider label="Today" />
          <Message
            condensed
            avatar={<Avatar size="avatar_sm" src="/placeholders/nft_30.png" />}
            name="sunsoutapersout"
            date="Today at 11:01AM"
            replies={{ userIds: [2, 3, 4], fakeLength: 150 }}
          >
            <Paragraph>How are you all doing today?</Paragraph>
          </Message>
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
          <Message
            condensed
            avatar={<Avatar size="avatar_sm" src="/placeholders/nft_28.png" />}
            name="deiguy"
            date="Today at 12:01AM"
          >
            <Paragraph>Nope!</Paragraph>
          </Message>
          <Message
            condensed
            avatar={<Avatar size="avatar_sm" src="/placeholders/nft_2.png" />}
            name="deiguy"
            date="Today at 12:01AM"
          >
            <Paragraph>Nope!</Paragraph>
          </Message>
          <Message
            condensed
            avatar={<Avatar size="avatar_sm" src="/placeholders/nft_39.png" />}
            name="deiguy"
            date="Today at 12:01AM"
          >
            <Paragraph>Nope!</Paragraph>
          </Message>
          <Message
            condensed
            avatar={<Avatar size="avatar_sm" src="/placeholders/nft_2.png" />}
            name="deiguy"
            date="Today at 12:01AM"
          >
            <Paragraph>
              Yes arm and I'm about to start another about marketing
            </Paragraph>
          </Message>
          <MessageInput />
        </Box>
      </Box>
      <Outlet />
    </Box>
  );
};
