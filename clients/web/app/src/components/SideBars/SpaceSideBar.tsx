import React, { useCallback } from "react";
import { useNavigate } from "react-router";
import {
  Membership,
  RoomIdentifier,
  SpaceData,
  useInvitesForSpace,
  useZionContext,
} from "use-zion-client";
import { ActionNavItem } from "@components/NavItem/ActionNavItem";
import { ChannelNavGroup } from "@components/NavItem/ChannelNavGroup";
import { ChannelNavItem } from "@components/NavItem/ChannelNavItem";
import { SpaceNavItem } from "@components/NavItem/SpaceNavItem";
import { FadeIn } from "@components/Transitions";
import { Badge, Stack } from "@ui";
import { useSizeContext } from "ui/hooks/useSizeContext";
import { atoms } from "ui/styles/atoms.css";
import { SideBar } from "./_SideBar";

type Props = {
  space: SpaceData;
};

const useTotalMentionCount = () => {
  const { mentionCounts } = useZionContext();
  return Object.entries(mentionCounts).reduce((total, e) => {
    return total + (e[1] || 0);
  }, 0);
};

export const SpaceSideBar = (props: Props) => {
  const { space } = props;
  const invites = useInvitesForSpace(space.id);
  const navigate = useNavigate();

  const totalMentions = useTotalMentionCount();

  const onSettings = useCallback(
    (id: RoomIdentifier) => {
      navigate(`/spaces/${id.slug}/settings`);
    },
    [navigate],
  );

  return (
    <SideBar>
      <Stack position="relative" background="level1" gap="md">
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
      <Stack paddingY="md">
        {space && (
          <SpaceNavItem
            exact
            name="Home"
            spaceName={space.name}
            icon="home"
            id={space.id}
            settings={space.membership === Membership.Join}
            onSettings={onSettings}
          />
        )}
        {space?.membership === Membership.Join && (
          <>
            {/* <ActionNavItem
              icon="threads"
              link={`/spaces/${space.id.slug}/highlights`}
              id="highlights"
              label="Highlights"
            /> */}
            <ActionNavItem
              icon="threads"
              link={`/spaces/${space.id.slug}/threads`}
              id="threads"
              label="Threads"
            />
            <ActionNavItem
              icon="at"
              highlight={totalMentions > 0}
              id="mentions"
              label="Mentions"
              badge={totalMentions > 0 && <Badge value={totalMentions} />}
              link={`/spaces/${space.id.slug}/mentions`}
            />
          </>
        )}
        {invites.map((m, index) => (
          <SpaceNavItem
            isInvite
            key={m.id.slug}
            id={m.id}
            name={m.name}
            avatar={m.avatarSrc}
            pinned={false}
          />
        ))}
        {space && (
          <>
            <ChannelList space={space} />
            <ActionNavItem
              icon="plus"
              id="newChannel"
              label="Create channel"
              link={`/spaces/${space.id.slug}/channels/new`}
            />
          </>
        )}
      </Stack>
    </SideBar>
  );
};

const ChannelList = (props: { space: SpaceData }) => {
  const sizeContext = useSizeContext();
  const isSmall = sizeContext.lessThan(120);
  const { space } = props;

  return (
    <>
      {space.channelGroups.map((group) => (
        <Stack key={group.label} display={isSmall ? "none" : undefined}>
          <ChannelNavGroup>{group.label}</ChannelNavGroup>
          {group.channels.map((channel) => {
            const key = `${group.label}/${channel.id.slug}`;
            return (
              <ChannelNavItem
                key={key}
                id={key}
                space={space}
                channel={channel}
              />
            );
          })}
        </Stack>
      ))}
    </>
  );
};
