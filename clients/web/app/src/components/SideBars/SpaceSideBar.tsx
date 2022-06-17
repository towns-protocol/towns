import React from "react";
import { ActionNavItem } from "@components/NavItem/ActionNavItem";
import { SpaceNavItem } from "@components/NavItem/SpaceNavItem";
import { Box, Paragraph, Stack } from "@ui";
import { SpaceData } from "data/SpaceData";
import { useSizeContext } from "ui/hooks/useSizeContext";
import { SideBar } from "./_SideBar";

type Props = {
  space: SpaceData;
};

export const SpaceSideBar = (props: Props) => {
  const { space } = props;

  return (
    <SideBar paddingY="sm">
      <ActionNavItem icon="back" link="/" id="" label="Back" />
      {space && (
        <SpaceNavItem
          exact
          id={space.id}
          avatar={space.avatarSrc}
          name={space.name}
        />
      )}
      <ActionNavItem
        icon="threads"
        link={`/spaces/${space.id}/threads`}
        id="threads"
        label="Threads"
      />
      <ActionNavItem
        icon="at"
        id="mentions"
        label="Mentions"
        link={`/spaces/${space.id}/mentions`}
      />
      <ActionNavItem
        icon="plus"
        id="newChannel"
        label="New Channel"
        link={`/spaces/${space.id}/channels/new`}
      />
      {space && <Channels space={space} />}
    </SideBar>
  );
};

const Channels = (props: { space: SpaceData }) => {
  const sizeContext = useSizeContext();
  const isSmall = sizeContext.lessThan(120);
  const { space } = props;
  return (
    <>
      {space.channelGroups.map((group) => (
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
