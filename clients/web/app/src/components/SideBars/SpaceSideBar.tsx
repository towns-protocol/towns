import React, { useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import {
  Membership,
  RoomIdentifier,
  SpaceData,
  useInvitesForSpace,
} from "use-matrix-client";
import { ActionNavItem } from "@components/NavItem/ActionNavItem";
import { SpaceNavItem } from "@components/NavItem/SpaceNavItem";
import { FadeIn } from "@components/Transitions";
import { Box, Paragraph, Stack } from "@ui";
import { useSizeContext } from "ui/hooks/useSizeContext";
import { atoms } from "ui/styles/atoms.css";
import { SideBar } from "./_SideBar";

type Props = {
  space: SpaceData;
};

export const SpaceSideBar = (props: Props) => {
  const { space } = props;
  const invites = useInvitesForSpace(space.id);
  const navigate = useNavigate();

  const onSettings = useCallback(
    (id: RoomIdentifier) => {
      navigate(`/spaces/${id.slug}/settings`);
    },
    [navigate],
  );

  return (
    <SideBar paddingY="sm">
      <Stack padding position="relative" background="level1" gap="md">
        <FadeIn>
          <img
            src="/placeholders/space_1.png"
            alt="space logo"
            width="500"
            height="400"
            className={atoms({
              flexGrow: "x1",
              display: "flex",
              fit: "width",
            })}
          />
        </FadeIn>
      </Stack>
      {space && (
        <SpaceNavItem
          exact
          name={space.name}
          id={space.id}
          avatar={space.avatarSrc}
          settings={space.membership === Membership.Join}
          onSettings={onSettings}
        />
      )}
      {space?.membership === Membership.Join && (
        <>
          <ActionNavItem
            icon="threads"
            link={`/spaces/${space.id.slug}/highlights`}
            id="highlights"
            label="Highlights"
          />
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
        </>
      )}
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
              link={`/spaces/${props.space.id.slug}/channels/${channel.id.slug}/`}
              label={channel.label}
            />
          ))}
        </Stack>
      ))}
    </>
  );
};
