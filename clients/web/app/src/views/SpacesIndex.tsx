import React, { ComponentProps, forwardRef } from "react";
import { ChatMessage } from "@components/ChatMessage";
import { Avatar, Box, BoxProps, Heading, Icon, Paragraph } from "@ui";

export const SpacesIndex = () => (
  <>
    <Box
      borderBottom
      alignItems="center"
      background="default"
      padding="md"
      paddingBottom="none"
      position="relative"
    >
      <LiquidContainer width="100%" height="25vh" maxHeight="400">
        <SpaceBanner image="/placeholders/frame_1.png" />
        <SpaceMenu />
      </LiquidContainer>
    </Box>
    <Box padding grow="x2" alignItems="center" background="level1">
      <SpaceMessages />
    </Box>
  </>
);

export const LiquidContainer = forwardRef<HTMLElement, BoxProps>(
  (props, ref) => <Box maxWidth="1200" width="100%" {...props} ref={ref} />
);

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
    padding="sm"
    background={props.selected ? "level2" : undefined}
    roundedTop="sm"
  >
    <Paragraph
      fontWeight={props.selected ? "strong" : undefined}
      color={props.selected ? "default" : "gray2"}
    >
      {props.label}
    </Paragraph>
  </Box>
);

const SpaceBanner = (props: SpaceBannerProps) => (
  <Box grow width="100%" justifyContent="center">
    <Box gap="md" direction="row">
      {/* avatar container */}
      <Box border padding="xs" borderRadius="lg" background="level1">
        <Avatar circle src="/placeholders/nft_9.png" size="xxl" />
      </Box>
      {/* title and stats container */}
      <Box grow justifyContent="center">
        <Heading>Title</Heading>
      </Box>
      {/* actions container */}
      <Box alignItems="center" direction="row" gap="xs">
        <MockDropDown />
        <Icon type="settings" background="level2" size="lg" />
      </Box>
    </Box>
  </Box>
);

const MockDropDown = () => (
  <Box
    direction="row"
    background="level2"
    alignItems="center"
    height="md"
    paddingX="sm"
    rounded="sm"
    fontSize="md"
    gap="xs"
  >
    boredpesir
    <Avatar circle nft src="/placeholders/nft_32.png" size="xs" />
    <Icon type="down" size="adapt" />
  </Box>
);
