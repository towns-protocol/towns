import React from "react";
import { SpaceSummary } from "@components/SpaceBanner/SpaceBanner";
import {
  Box,
  ButtonText,
  Heading,
  Icon,
  Stack,
  Tooltip,
  TooltipRenderer,
} from "@ui";
import { Avatar } from "ui/components/Avatar/Avatar";
import { useSpaceDataStore } from "store/spaceDataStore";
import { NavItem } from "./_NavItem";

type Props = {
  id: string;
  name: string;
  avatar: string;
  active?: boolean;
  pinned?: boolean;
  exact?: boolean;
  compact?: boolean;
  isInvite?: boolean;
};

const SpaceTooltip = (props: { id: string }) => {
  const { getSpaceData } = useSpaceDataStore();
  const { id } = props;
  const { name } = getSpaceData(id);
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
  const {
    id,
    active,
    avatar,
    exact,
    name,
    pinned,
    compact: isCompact,
    isInvite,
  } = props;

  return (
    <TooltipRenderer
      layoutId="navitem"
      placement="horizontal"
      render={<SpaceTooltip id={props.id} />}
    >
      {({ triggerProps }) => (
        <NavItem
          id={id}
          to={isInvite ? `/invites/${id}` : `/spaces/${id}`}
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
          <ButtonText
            grow
            truncate
            color={active ? "default" : undefined}
            strong={active}
            display={{ tablet: "none" }}
          >
            {isInvite ? "(Invite) " + name : name}
          </ButtonText>
          <Box shrink display={{ tablet: "none" }} color="gray2">
            {pinned && <Icon type="pin" size="square_sm" padding="xs" />}
          </Box>
        </NavItem>
      )}
    </TooltipRenderer>
  );
};
