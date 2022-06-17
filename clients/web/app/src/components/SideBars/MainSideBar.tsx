import React, { useMemo } from "react";
import { Box, Paragraph, Stack, Text } from "@ui";
import { ActionNavItem } from "@components/NavItem/ActionNavItem";
import { SpaceNavItem } from "@components/NavItem/SpaceNavItem";
import { SideBar } from "@components/SideBars/_SideBar";
import { useSpaceDataStore } from "store/spaceDataStore";
import { useSizeContext } from "ui/hooks/useSizeContext";
import { SpaceData } from "data/SpaceData";

export const MainSideBar = () => {
  const { spaces, invites } = useSpaceDataStore();
  const space = spaces.find((s) => s.id === "council");

  const realSpaces = useMemo(
    () => spaces.filter((s) => !s.isFakeSpace),
    [spaces],
  );

  return (
    <SideBar paddingY="sm">
      <Stack padding position="relative" background="level1" gap="md">
        <Text as="h1" size="logo" fontWeight="strong">
          ZION
        </Text>
        <Text as="h1" size="logo" fontWeight="strong">
          COU
        </Text>
        <Text as="h1" size="logo" fontWeight="strong">
          NCIL
        </Text>
      </Stack>
      {navItems.map((n, index) => (
        <ActionNavItem key={n.id} {...n} />
      ))}
      {invites.map((m, index) => (
        <SpaceNavItem
          isInvite
          key={m.id}
          active={m.active}
          id={m.id}
          name={m.name}
          avatar={m.avatarSrc}
          pinned={m.pinned}
        />
      ))}
      {space && <Channels space={space} />}
      {realSpaces.length > 0 && <RealSpaces spaces={realSpaces} />}
    </SideBar>
  );
};

const navItems = [
  { id: "home", link: "/", icon: "home", label: "Home" },
  {
    id: "messages",
    link: "/messages/latest",
    icon: "message",
    label: "Messages",
  },
  { id: "spaces/new", link: "/spaces/new", icon: "plus", label: "New Space" },
] as const;

const Channels = (props: { space: SpaceData }) => {
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
              id={group.label + channel.id}
              key={group.label + channel.id}
              icon="tag"
              highlight={channel.highlight}
              link={`/spaces/${props.space.id}/${channel.id}`}
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
          Your Spaces:
        </Paragraph>
      </Box>
      {spaces.map((m, index) => (
        <SpaceNavItem
          key={m.id}
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
