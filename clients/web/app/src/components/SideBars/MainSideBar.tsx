import React from "react";
import { useInvites, useSpaceContext, useZionContext } from "use-zion-client";
import { ActionNavItem } from "@components/NavItem/ActionNavItem";
import { SpaceNavItem } from "@components/NavItem/SpaceNavItem";
import { ProfileCardButton } from "@components/ProfileCardButton/ProfileCardButton";
import { SideBar } from "@components/SideBars/_SideBar";
import { Badge, IconButton, Stack } from "@ui";

type Props = {
  expanded: boolean;
  onExpandClick: () => void;
};

export const MainSideBar = (props: Props) => {
  const { expanded: isExpanded } = props;
  const { spaces, spaceMentionCounts } = useZionContext();
  const { spaceId } = useSpaceContext();
  const invites = useInvites();

  return (
    <SideBar paddingY="sm">
      <Stack grow>
        {spaces.map((s) => (
          <SpaceNavItem
            key={s.id.slug}
            exact={false}
            forceMatch={s.id.matrixRoomId === spaceId?.matrixRoomId}
            id={s.id}
            name={s.name}
            avatar={s.avatarSrc}
            pinned={false}
            mentions={spaceMentionCounts[s.id.matrixRoomId]}
          />
        ))}
        <ActionNavItem
          id="spaces/new"
          link="/spaces/new"
          icon="plus"
          label="New Space"
        />
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
      </Stack>
      <Stack
        padding
        gap
        key="profile_container"
        justifyContent="spaceBetween"
        alignItems="start"
        horizontal={isExpanded}
      >
        <ProfileCardButton expanded={isExpanded} />
        <IconButton
          centerContent
          opaque
          icon={isExpanded ? "sidebaropen" : "sidebarclose"}
          size="square_md"
          onClick={props.onExpandClick}
        />
      </Stack>
    </SideBar>
  );
};
