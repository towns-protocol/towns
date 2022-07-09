import React, { useCallback } from "react";
import { useNavigate } from "react-router";
import { ActionNavItem } from "@components/NavItem/ActionNavItem";
import { SpaceNavItem } from "@components/NavItem/SpaceNavItem";
import { Box, Paragraph, Stack } from "@ui";
import { SpaceData } from "data/SpaceData";
import { useSizeContext } from "ui/hooks/useSizeContext";
import { atoms } from "ui/styles/atoms.css";
import { SideBar } from "./_SideBar";

type Props = {
  space: SpaceData;
};

export const SpaceSideBar = (props: Props) => {
  const { space } = props;

  const navigate = useNavigate();

  const onSettings = useCallback(
    (id: string) => {
      navigate(`/spaces/${id}/settings`);
    },
    [navigate],
  );

  return (
    <SideBar paddingY="sm">
      <Stack padding position="relative" background="level1" gap="md">
        <img
          src="/placeholders/space_1.png"
          alt="space logo"
          width="500"
          className={atoms({
            flexGrow: "x1",
            display: "flex",
            width: "100%",
          })}
        />
      </Stack>
      <ActionNavItem icon="back" link="/" id="back" label="Back" />
      {space && (
        <SpaceNavItem
          exact
          settings
          name={space.name}
          id={space.id}
          avatar={space.avatarSrc}
          onSettings={onSettings}
        />
      )}
      <ActionNavItem
        icon="threads"
        link={`/spaces/${space.id.slug}/threads`}
        id="threads"
        label="Threads"
      />
      <ActionNavItem
        icon="at"
        id="mentions"
        label="Mentions"
        link={`/spaces/${space.id.slug}/mentions`}
      />
      <ActionNavItem
        icon="plus"
        id="newChannel"
        label="New Channel"
        link={`/spaces/${space.id.slug}/channels/new`}
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
              id={group.label + channel.id.slug}
              key={group.label + channel.id.slug}
              icon="tag"
              highlight={channel.highlight}
              link={`/spaces/${props.space.id.slug}/channels/${channel.id.slug}`}
              label={channel.label}
            />
          ))}
        </Stack>
      ))}
    </>
  );
};
