import React, { ComponentProps, forwardRef } from "react";
import { ChatMessage } from "@components/ChatMessage";
import { Avatar, Box, BoxProps, Heading, Icon, Paragraph, Stack } from "@ui";

export const SpacesIndex = () => (
  <>
    <Box
      borderBottom
      grow
      alignItems="center"
      paddingBottom="none"
      position="relative"
      maxHeight="400"
    >
      <LiquidContainer grow width="100%">
        <SpaceBanner image="/placeholders/frame_1.png" />
        <SpaceMenu />
      </LiquidContainer>
    </Box>
    <Box grow paddingY="sm" alignItems="center" background="level1">
      <SpaceMessages />
    </Box>
  </>
);

export const LiquidContainer = forwardRef<
  HTMLElement,
  { fullbleed?: boolean } & BoxProps
>((props, ref) => (
  <Box
    maxWidth={(!props.fullbleed && "1200") || "100%"}
    width="100%"
    {...props}
    ref={ref}
    paddingX="md"
  />
));

const SpaceMessages = () => (
  <LiquidContainer gap="sm">
    <RoundedMessage
      channel="announcements"
      name="sunsoutapesout"
      avatar={<Avatar nft src="/placeholders/nft_2.png" />}
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
      avatar={<Avatar nft src="/placeholders/nft_20.png" />}
      date="Today at 11:01 AM"
      replies={{ ids: [1, 2, 3], fakeLength: 150 }}
    >
      <Paragraph>Sry guys. Im a noob what the KYC about?</Paragraph>
    </RoundedMessage>

    <RoundedMessage
      channel="crypto-talk"
      name="shimmyshimmy"
      avatar={<Avatar nft src="/placeholders/nft_40.png" />}
      date="Today at 11:01 AM"
      reactions={{ "😍": 3, "😂": 13, "💀": 5 }}
    >
      <Paragraph>
        <a href="https://twitter.com/BoredApeYC/status/1501333629804244993">
          https://twitter.com/BoredApeYC/status/1501333629804244993
        </a>
      </Paragraph>

      <QuotedMessage avatar={<Avatar circle src="/placeholders/nft_25.png" />}>
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

type SpaceBannerProps = {
  image?: string;
};

const RoundedMessage = (props: ComponentProps<typeof ChatMessage>) => (
  <ChatMessage rounded="sm" padding="sm" background="default" {...props} />
);

const QuotedMessage = (props: {
  avatar: React.ReactNode;
  children: React.ReactNode;
}) => (
  <Box paddingTop="sm" maxWidth="400">
    <Box rounded="sm" padding="sm" background="level2" gap="sm" color="default">
      <Box direction="row" gap="xs" height="sm" alignItems="center">
        {props.avatar}
        <Box gap="xxs">
          <Heading level={5}>Bored Ape Yacht Club</Heading>
          <Paragraph size="sm">@boredapeYC</Paragraph>
        </Box>
      </Box>
      <Box>{props.children}</Box>
    </Box>
  </Box>
);

const SpaceMenu = () => (
  <Box direction="row" gap="xs">
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
    paddingX="sm"
    background={props.selected ? "level2" : undefined}
    roundedTop="sm"
    justifyContent="center"
  >
    <Paragraph
      strong={props.selected}
      color={props.selected ? "default" : "gray2"}
    >
      {props.label}
    </Paragraph>
  </Box>
);

const SpaceBanner = (props: SpaceBannerProps) => (
  <Stack grow width="100%" justifyContent="center">
    <Stack horizontal gap="sm" padding="sm">
      {/* avatar container */}
      <Box border padding="xs" borderRadius="lg" background="level1">
        <Avatar circle src="/placeholders/nft_9.png" size="xxl" />
      </Box>
      {/* title and stats container */}
      <Stack grow justifyContent="center" gap="sm">
        <Heading level={3}>Border Ape Yacht Club</Heading>
        <Stack horizontal gap="sm" color="gray1">
          <Stack horizontal gap="xs" alignItems="center">
            <Box background="accent" square="xxs" rounded="full" />
            <Paragraph size="lg">2.3K</Paragraph>
          </Stack>
          <Stack horizontal gap="xs" alignItems="center">
            <Icon type="token" size="xs" />
            <Paragraph size="lg">12.4M</Paragraph>
          </Stack>
        </Stack>
      </Stack>
      {/* actions container */}
      <Stack alignItems="center" direction="row" gap="xs">
        <MockDropDown />
        <Icon type="settings" background="level2" size="lg" padding="xs" />
      </Stack>
    </Stack>
  </Stack>
);

const MockDropDown = () => (
  <Stack
    horizontal
    background="level2"
    alignItems="center"
    height="x4"
    paddingX="sm"
    rounded="sm"
    fontSize="md"
    gap="xs"
  >
    boredpesir
    <Avatar circle nft src="/placeholders/nft_32.png" size="xs" />
    <Icon type="down" size="adapt" />
  </Stack>
);
