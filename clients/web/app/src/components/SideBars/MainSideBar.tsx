import React from "react";
import { SpaceData, useInvites, useSpaces } from "use-zion-client";
import { ActionNavItem } from "@components/NavItem/ActionNavItem";
import { SpaceNavItem } from "@components/NavItem/SpaceNavItem";
import { SideBar } from "@components/SideBars/_SideBar";
import { Box, Paragraph, Stack } from "@ui";
import { useSizeContext } from "ui/hooks/useSizeContext";

export const MainSideBar = () => {
  const spaces = useSpaces();
  const invites = useInvites();

  return (
    <SideBar paddingY="sm">
      {navItems.map((n, index) => (
        <ActionNavItem key={n.id} {...n} />
      ))}
      {invites.map((m, index) => (
        <SpaceNavItem
          isInvite
          key={m.id.slug}
          active={false}
          id={m.id}
          name={m.name}
          avatar={m.avatarSrc}
          pinned={false}
        />
      ))}
      {/* {space && <Channels space={space} />} */}
      {spaces.length > 0 && <RealSpaces spaces={spaces} />}
    </SideBar>
  );
};

const navItems = [
  { id: "home", link: "/", icon: "home", label: "Home" },
  // {
  //   id: "messages",
  //   link: "/messages/latest",
  //   icon: "message",
  //   label: "Messages",
  // },
  { id: "spaces/new", link: "/spaces/new", icon: "plus", label: "New Space" },
] as const;

export const Channels = (props: { space: SpaceData }) => {
  const sizeContext = useSizeContext();
  const isSmall = sizeContext.lessThan(120);
  return (
    <>
      {props.space?.channelGroups.map((group) => (
        <Stack key={group.label} display={isSmall ? "none" : undefined}>
          <Box
            paddingX="md"
            height="height_lg"
            paddingY="sm"
            justifyContent="end"
          >
            <Paragraph color="gray2" textTransform="uppercase">
              {group.label}
            </Paragraph>
          </Box>
          {group.channels.map((channel) => (
            <ActionNavItem
              id={group.label + channel.id.slug}
              key={group.label + channel.id.slug}
              icon="tag"
              highlight={channel.highlight}
              link={`/spaces/${props.space.id.slug}/channels/${channel.id.slug}/`}
              label={channel.label}
            />
          ))}
        </Stack>
      ))}
    </>
  );
};

const RealSpaces = (props: { spaces: SpaceData[] }) => {
  const { spaces } = props;
  return (
    <>
      <Box paddingX="md" height="height_lg" paddingY="sm" justifyContent="end">
        <Paragraph color="gray2" textTransform="uppercase">
          Your Spaces
        </Paragraph>
      </Box>
      {spaces.map((m, index) => (
        <SpaceNavItem
          key={m.id.slug}
          active={m.active}
          id={m.id}
          name={m.name}
          avatar={m.avatarSrc}
          pinned={m.pinned}
        />
      ))}
    </>
  );
};
