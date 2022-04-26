import React, { ComponentProps, forwardRef } from "react";
import { useParams } from "react-router";
import { Message } from "@components/Message";
import { SpaceBanner } from "@components/SpaceBanner/SpaceBanner";
import {
  Avatar,
  BackgroundImage,
  Box,
  BoxProps,
  Heading,
  Paragraph,
  Stack,
} from "@ui";
import { fakeSpaces } from "data/SpaceData";

export const SpacesIndex = () => {
  const { spaceId } = useParams();
  const space = fakeSpaces.find((s) => s.id === spaceId) ?? fakeSpaces[0];
  return (
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
        <Box position="relative" width="100%" height="100%" alignItems="center">
          <LiquidContainer grow width="100%">
            <SpaceBanner avatarSrc={space.avatarSrc} name={space.name} />
            <SpaceMenu />
          </LiquidContainer>
        </Box>
      </Stack>
      <Box grow paddingY="sm" alignItems="center" background="level1">
        <SpaceMessages />
      </Box>
    </>
  );
};

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
      replies={{ userIds: [1, 2, 3], fakeLength: 150 }}
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

const RoundedMessage = (props: ComponentProps<typeof Message>) => (
  <Message rounded="sm" padding="sm" background="default" {...props} />
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
