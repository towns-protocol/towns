import React, { forwardRef } from "react";
import { useParams } from "react-router-dom";
import { BackgroundImage } from "@components/BackgroundImage";
import { ChatMessage } from "@components/ChatMessage";
import { NavContainer } from "@components/MainNav/MainNav";
import { MainAction } from "@components/MainNavActions/MainNavActions";
import {
  SpaceNavItem,
  mockSpaces,
} from "@components/SpaceNavItem/SpaceNavItem";
import { Avatar, Box, BoxProps, Heading, Icon, Paragraph } from "@ui";

export const Spaces = () => {
  const { space: spaceId } = useParams();
  const space = mockSpaces.find((s) => s.id === spaceId) ?? mockSpaces[0];
  return (
    <Box grow direction="row">
      <NavContainer>
        <MainAction icon="back" link="/" id="" label="Back" />
        {space && (
          <SpaceNavItem id={space.id} avatar={space.avatar} name={space.name} />
        )}
        <MainAction icon="threads" link="" id="" label="Threads" />
        <MainAction icon="at" id="" link="" label="Mentions" />
      </NavContainer>
      <Box grow="x9">
        <Box borderBottom alignItems="center">
          <LiquidContainer width="100%" height="25vh" maxHeight="400">
            <SpaceBanner image={undefined && "/placeholders/frame_1.png"} />
            <SpaceMenu />
          </LiquidContainer>
        </Box>
        <Box grow="x2" alignItems="center" padding="md" background="level1">
          <SpaceMessages />
        </Box>
      </Box>
    </Box>
  );
};

type SpaceBannerProps = {
  image?: string;
};

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
  <Box grow padding="md" width="100%">
    {props.image && <BackgroundImage src={props.image} />}
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

const SpaceMessages = () => (
  <LiquidContainer background="level1">
    <ChatMessage
      rounded="sm"
      padding="sm"
      channel="#general"
      name="sunsoutapesout"
      avatar={<Avatar nft src="/placeholders/nft_2.png" />}
      date="Today at 11:01 AM"
      reactions={{ "👋": 20 }}
      background="default"
    >
      <p>
        Hey <strong>@everyone</strong>,
      </p>
      <p>
        We're thrilled to announce that <strong>@steamboy</strong> has joined
        the core team full-time as our Art Director!
      </p>
      <p>
        Let's give our newest team members a warm welcome! They're no strangers
        to the community and we would not be where we're at today if it weren't
        for them.
      </p>
    </ChatMessage>
  </LiquidContainer>
);

const LiquidContainer = forwardRef<HTMLElement, BoxProps>((props, ref) => (
  <Box maxWidth="1200" width="100%" {...props} ref={ref} />
));

const MockDropDown = () => (
  <Box
    direction="row"
    background="level2"
    alignItems="center"
    height="md"
    paddingX="sm"
    rounded="sm"
    fontSize="md"
    gap="xxs"
  >
    boredpesir
    <Avatar circle src="/placeholders/nft_3.png" size="sm" />
    <Icon type="down" size="adapt" />
  </Box>
);
