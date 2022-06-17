import { Allotment } from "allotment";
import React, { useCallback, useMemo, useState } from "react";
import { useOutlet, useParams } from "react-router-dom";
import {
  RoomMessage,
  useMatrixClient,
  useMatrixStore,
} from "use-matrix-client";
import { ContextBar } from "@components/ContextBar";
import { Message } from "@components/Message";
import { MessageInput } from "@components/MessageInput/MessageInput";
import { Avatar, Box, Divider, Paragraph, Stack } from "@ui";
import { usePersistPanes } from "hooks/usePersistPanes";
import { useSpaceDataStore } from "store/spaceDataStore";
import { LiquidContainer } from "./SpacesIndex";

export const SpacesChannel = () => {
  const { spaceId, channelId } = useParams();
  const { sizes, onSizesChange } = usePersistPanes(["channel", "right"]);
  const outlet = useOutlet();
  const { allMessages } = useMatrixStore();
  const { sendMessage } = useMatrixClient();
  const [newMessage, setNewMessage] = useState<string>("");

  const { spaces } = useSpaceDataStore();

  const space = useMemo(
    () => spaces.find((s) => s.id === spaceId),
    [spaceId, spaces],
  );

  const channelMessages = useMemo(
    () => (allMessages && channelId ? allMessages[channelId] ?? [] : []),
    [allMessages, channelId],
  );

  const messagesLength = useMemo(
    () => channelMessages.length,
    [channelMessages.length],
  );
  const onTextChanged = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setNewMessage(event.target.value);
    },
    [setNewMessage],
  );

  const onKeyDown = useCallback(
    async (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (!channelId) {
        return;
      }
      if (event.key === "Enter" && newMessage) {
        await sendMessage(channelId, newMessage);
        setNewMessage("");
      }
    },
    [newMessage, sendMessage, channelId, setNewMessage],
  );
  return (
    <Stack horizontal minHeight="100%">
      <Allotment defaultSizes={sizes} onChange={onSizesChange}>
        <Allotment.Pane>
          <Box grow>
            <ContextBar title={`# ${channelId}`} />
            <Box padding gap="lg">
              {messagesLength ? (
                <ChannelMessages messages={channelMessages} />
              ) : space?.isFakeSpace ? (
                <FakeMessages />
              ) : (
                <></>
              )}
              <MessageInput
                value={newMessage}
                onChange={onTextChanged}
                onKeyDown={onKeyDown}
              />
            </Box>
          </Box>
        </Allotment.Pane>
        {outlet && (
          <Allotment.Pane minSize={300} preferredSize={320} maxSize={640}>
            {outlet}
          </Allotment.Pane>
        )}
      </Allotment>
    </Stack>
  );
};

const ChannelMessages = (props: { messages: RoomMessage[] }) => (
  <LiquidContainer gap="sm" paddingY="sm">
    {props.messages.map((m, index) => (
      <Message
        condensed
        key={m.eventId}
        name={m.sender}
        avatar={<Avatar circle src="/placeholders/nft_2.png" />}
        date="Today sometime?"
      >
        <Paragraph>{m.body}</Paragraph>
      </Message>
    ))}
  </LiquidContainer>
);

const FakeMessages = () => (
  <>
    <Message
      condensed
      avatar={<Avatar circle size="avatar_sm" />}
      name="sunsoutapersout"
      date="Today at 11:01AM"
      reactions={{ "👋": 20 }}
    >
      <p>
        gm! name is francine groves and I'm a big nft fan. I currently moderate
        for Veefriends, Boss Beauties, Fame Ladies, BFF, Flyfish Club, Legacy
        Leaders and All Around Artsy. Soon to add my own project to that list.
      </p>
      <p>
        I'm a farmer and herbalist (also pagan and ordained), own a digital
        marketing agency and am a musician. Husband and I run a YouTube channel
        about our farm and I'm about to start another about marketing and nft's.
      </p>
    </Message>
    <Divider label="Today" />
    <Message
      condensed
      avatar={<Avatar circle size="avatar_sm" src="/placeholders/nft_30.png" />}
      name="sunsoutapersout"
      date="Today at 11:01AM"
      replies={{ userIds: [2, 3, 4], fakeLength: 150 }}
    >
      <Paragraph>How are you all doing today?</Paragraph>
    </Message>
    <Message
      condensed
      avatar={<Avatar circle size="avatar_sm" />}
      name="sunsoutapersout"
      date="Today at 11:01AM"
      reactions={{ "👀": 20, "🤑": 2 }}
    >
      <Paragraph>
        I'm a farmer and herbalist (also pagan and ordained), own a digital
        marketing agency and am a musician. Husband and I run a YouTube channel
        about our farm and I'm about to start another about marketing and nft's.
      </Paragraph>
    </Message>
    <Message
      condensed
      avatar={<Avatar circle size="avatar_sm" src="/placeholders/nft_2.png" />}
      name="deiguy"
      date="Today at 12:01AM"
    >
      <Paragraph>
        Channel about our farm and I'm about to start another about marketing
        and nft's.
      </Paragraph>
    </Message>
    <Message
      condensed
      avatar={<Avatar circle size="avatar_sm" src="/placeholders/nft_28.png" />}
      name="deiguy"
      date="Today at 12:01AM"
    >
      <Paragraph>Nope!</Paragraph>
    </Message>
    <Message
      condensed
      avatar={<Avatar circle size="avatar_sm" src="/placeholders/nft_2.png" />}
      name="deiguy"
      date="Today at 12:01AM"
    >
      <Paragraph>Nope!</Paragraph>
    </Message>
    <Message
      condensed
      avatar={<Avatar circle size="avatar_sm" src="/placeholders/nft_39.png" />}
      name="deiguy"
      date="Today at 12:01AM"
    >
      <Paragraph>Nope!</Paragraph>
    </Message>
    <Message
      condensed
      avatar={<Avatar circle size="avatar_sm" src="/placeholders/nft_2.png" />}
      name="deiguy"
      date="Today at 12:01AM"
    >
      <Paragraph>
        Yes arm and I'm about to start another about marketing
      </Paragraph>
    </Message>
  </>
);
