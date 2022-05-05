import React from "react";
import { SpaceSummary } from "@components/SpaceBanner/SpaceBanner";
import { Box, Heading, Icon, Stack } from "@ui";
import { fakeSpaceCache } from "data/SpaceData";
import { Avatar } from "ui/components/Avatar/Avatar";
import { Tooltip, TooltipRenderer } from "ui/components/Tooltip/Tooltip";
import { NavItem } from "./_NavItem";

type Props = {
  id: string;
  name: string;
  avatar: string;
  active?: boolean;
  pinned?: boolean;
  exact?: boolean;
  compact?: boolean;
};

const SpaceTooltip = (props: { id: string }) => {
  const { id } = props;
  const { name } = fakeSpaceCache[id];
  return (
    <Tooltip
      horizontal
      id={id}
      key={id}
      gap="md"
      padding="md"
      background="default"
      display={{ desktop: "none", tablet: "flex" }}
    >
      <Stack grow justifyContent="center" gap="sm">
        <Heading level={4}>{name}</Heading>
        <SpaceSummary compact />
      </Stack>
    </Tooltip>
  );
};

export const SpaceNavItem = (props: Props) => {
  const { id, active, avatar, exact, name, pinned, compact: isCompact } = props;

  return (
    <TooltipRenderer
      id={props.id}
      placement="horizontal"
      render={<SpaceTooltip id={props.id} />}
    >
      {({ triggerProps }) => (
        <NavItem
          id={id}
          compact={isCompact}
          to={`/spaces/${id}`}
          exact={exact}
          {...triggerProps}
        >
          <Avatar
            animate
            src={avatar}
            size={
              isCompact
                ? { desktop: "avatar_sm", tablet: "avatar_lg" }
                : { desktop: "avatar_lg", tablet: "avatar_lg" }
            }
          />
          <Heading
            grow
            truncate
            level={5}
            color={active ? "default" : undefined}
            display={{ tablet: "none" }}
          >
            {name}
          </Heading>
          <Box shrink display={{ tablet: "none" }}>
            {pinned && <Icon type="pin" size="square_xxs" />}
          </Box>
        </NavItem>
      )}
    </TooltipRenderer>
  );
};
