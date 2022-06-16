import React, {
  ComponentProps,
  forwardRef,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  RoomMessage,
  useMatrixClient,
  useMatrixStore,
} from "use-matrix-client";
import { Message } from "@components/Message";
import { SpaceBanner } from "@components/SpaceBanner/SpaceBanner";
import {
  Avatar,
  BackgroundImage,
  Box,
  BoxProps,
  ButtonText,
  Divider,
  Heading,
  Paragraph,
  Stack,
} from "@ui";
import { useSpaceDataStore } from "store/spaceDataStore";
import { MessageInput } from "@components/MessageInput/MessageInput";

export const SpacesIndex = () => {
  const { spaceId } = useParams();
  const { spaces } = useSpaceDataStore();
  const navigate = useNavigate();
  const { allMessages } = useMatrixStore();
  const { sendMessage, syncSpace } = useMatrixClient();
  const [newMessage, setNewMessage] = useState<string>("");

  const space = spaces.find((s) => s.id === spaceId);

  useEffect(() => {
    (async () => {
      if (spaceId) {
        try {
          await syncSpace(spaceId);
        } catch (reason) {
          console.log("SpacesIndex error:", reason);
        }
      }
    })();
  }, [spaceId, syncSpace]);

  const onSettingsClicked = useCallback(() => {
    navigate("/spaces/" + spaceId + "/settings");
  }, [navigate, spaceId]);

  const onTextChanged = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setNewMessage(event.target.value);
    },
    [setNewMessage],
  );

  const onKeyDown = useCallback(
    async (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (!spaceId) {
        return;
      }
      if (event.key === "Enter" && newMessage) {
        await sendMessage(spaceId, newMessage);
        setNewMessage("");
      }
    },
    [newMessage, sendMessage, spaceId, setNewMessage],
  );

  const roomMessages = useMemo(() => {
    if (allMessages && spaceId) {
      const messages = allMessages[spaceId];
      if (messages && messages.length > 0) {
        return messages;
      }
    }

    return undefined;
  }, [allMessages, spaceId]);

  const messagesLength = useMemo(
    () => roomMessages?.length,
    [roomMessages?.length],
  );

  return (
    <>
      {space ? (
        <>
          <Stack
            borderBottom
            grow
            alignItems="center"
            paddingBottom="none"
            position="relative"
            maxHeight="400"
          >
            <Box position="absolute" width="100%" height="100%">
              {space.bannerSrc && (
                <BackgroundImage
                  size="cover"
                  overlay="dark"
                  src={space.bannerSrc}
                />
              )}
            </Box>
            <Box
              position="relative"
              width="100%"
              height="100%"
              alignItems="center"
            >
              <LiquidContainer grow width="100%">
                <SpaceBanner
                  avatarSrc={space.avatarSrc}
                  name={space.name}
                  onSettingsClicked={onSettingsClicked}
                />
                <SpaceMenu />
              </LiquidContainer>
            </Box>
          </Stack>
          <Box grow alignItems="center" background="level2">
            {roomMessages && messagesLength ? (
              <SpaceMessages messages={roomMessages} />
            ) : (
              <FakeSpaceMessages />
            )}
          </Box>

          <Divider />
          <Box gap="md">
            <MessageInput
              value={newMessage}
              onChange={onTextChanged}
              onKeyDown={onKeyDown}
            />
          </Box>
        </>
      ) : (
        <p>Space "{spaceId}" not found</p>
      )}
    </>
  );
};

export const LiquidContainer = forwardRef<
  HTMLElement,
  { fullbleed?: boolean } & BoxProps
>(({ fullbleed, ...props }, ref) => (
  <Box
    maxWidth={(!fullbleed && "1200") || "100%"}
    width="100%"
    {...props}
    ref={ref}
    paddingX="lg"
  />
));

const SpaceMessages = (props: { messages: RoomMessage[] }) => (
  <LiquidContainer gap="sm" paddingY="sm">
    {props.messages.map((m, index) => (
      <RoundedMessage
        channel=""
        name={m.sender}
        avatar={<Avatar circle src="/placeholders/nft_2.png" />}
        date="Today sometime?"
        reactions={{}}
      >
        <Paragraph>{m.message}</Paragraph>
      </RoundedMessage>
    ))}
  </LiquidContainer>
);

const FakeSpaceMessages = () => (
  <LiquidContainer gap="sm" paddingY="sm">
    <RoundedMessage
      channel="announcements"
      name="sunsoutapesout"
      avatar={<Avatar circle src="/placeholders/nft_2.png" />}
      date="Today at 11:01 AM"
      reactions={{ "👋": 20 }}
    >
      <Paragraph>
        Hey <strong>@everyone</strong>,
      </Paragraph>
      <Paragraph>
        We're thrilled to announce that <strong>@steamboy</strong> has joined
        the core team full-time as our Art Director!
      </Paragraph>
      <Paragraph>
        Let's give our newest team members a warm welcome! They're no strangers
        to the community and we would not be where we're at today if it weren't
        for them.
      </Paragraph>
    </RoundedMessage>

    <RoundedMessage
      channel="general"
      name="hana.eth"
      avatar={<Avatar circle src="/placeholders/nft_20.png" />}
      date="Today at 11:01 AM"
      replies={{ userIds: [1, 2, 3], fakeLength: 150 }}
    >
      <Paragraph>Sry guys. Im a noob what the KYC about?</Paragraph>
    </RoundedMessage>

    <RoundedMessage
      channel="crypto-talk"
      name="shimmyshimmy"
      avatar={<Avatar circle src="/placeholders/nft_40.png" />}
      date="Today at 11:01 AM"
      reactions={{ "😍": 3, "😂": 13, "💀": 5 }}
      userReaction="😍"
    >
      <Paragraph>
        <a href="https://twitter.com/BoredApeYC/status/1501333629804244993">
          https://twitter.com/BoredApeYC/status/1501333629804244993
        </a>
      </Paragraph>

      <QuotedMessage
        avatar={
          <Avatar circle size="avatar_lg" src="/placeholders/nft_25.png" />
        }
      >
        <Paragraph>
          It's been inspiring seeing our community come together in support of
          Ukraine - almost $1m in ETH has been donated to @Ukraine by wallets
          containing a BAYC ecosystem NFT. Today we're matching that with a $1m
          ETH donation of our own. 🦍♥️🇺🇦
        </Paragraph>
      </QuotedMessage>
    </RoundedMessage>
  </LiquidContainer>
);

export const RoundedMessage = (props: ComponentProps<typeof Message>) => (
  <Message rounded="sm" padding="paragraph" background="default" {...props} />
);

const QuotedMessage = (props: {
  avatar: React.ReactNode;
  children: React.ReactNode;
}) => (
  <Stack paddingTop="md" maxWidth="400">
    <Stack
      rounded="sm"
      padding="md"
      background="level3"
      gap="md"
      color="default"
    >
      <Stack horizontal gap="sm" height="height_md" alignItems="center">
        {props.avatar}
        <Box gap="sm" color="gray1">
          <Heading level={6}>Bored Ape Yacht Club</Heading>
          <Paragraph size="sm">@boredapeYC</Paragraph>
        </Box>
      </Stack>
      <Box>{props.children}</Box>
    </Stack>
  </Stack>
);

const SpaceMenu = () => (
  <Box direction="row" gap="sm">
    <SpaceMenuItem selected label="Home" />
    <SpaceMenuItem label="Trade" />
    <SpaceMenuItem label="Vote" />
    <SpaceMenuItem label="Events" />
    <SpaceMenuItem label="Projects" />
    <SpaceMenuItem label="Swag" />
    <SpaceMenuItem label="About" />
  </Box>
);

const SpaceMenuItem = (props: { label: string; selected?: boolean }) => (
  <Box
    shrink
    height="x4"
    paddingX="md"
    background={props.selected ? "level3" : undefined}
    roundedTop="sm"
    justifyContent="center"
  >
    <ButtonText
      strong={props.selected}
      color={props.selected ? "default" : "gray2"}
    >
      {props.label}
    </ButtonText>
  </Box>
);
