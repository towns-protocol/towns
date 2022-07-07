import React from "react";
import { RoomIdentifier } from "use-matrix-client";
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
import { useSizeContext } from "ui/hooks/useSizeContext";
import { NavItem } from "./_NavItem";

type Props = {
  id: RoomIdentifier;
  name: string;
  avatar: string;
  active?: boolean;
  pinned?: boolean;
  exact?: boolean;
  isInvite?: boolean;
};

const SpaceTooltip = (props: { id: RoomIdentifier; name: string }) => {
  const { id, name } = props;
  return (
    <Tooltip
      horizontal
      id={id.slug}
      key={id.slug}
      gap="md"
      padding="md"
      background="default"
    >
      <Stack grow justifyContent="center" gap="sm">
        <Heading level={4}>{name}</Heading>
        <SpaceSummary compact />
      </Stack>
    </Tooltip>
  );
};

export const SpaceNavItem = (props: Props) => {
  const { id, active, avatar, exact, name, pinned, isInvite } = props;

  const sizeContext = useSizeContext();
  // TODO: use tokens
  const isSmall = sizeContext.lessThan(180);

  return (
    <TooltipRenderer
      layoutId="navitem"
      placement="horizontal"
      render={
        (isSmall && <SpaceTooltip id={props.id} name={props.name} />) || <></>
      }
    >
      {({ triggerProps }) => (
        <NavItem
          id={id.slug}
          to={isInvite ? `/invites/${id.slug}` : `/spaces/${id.slug}`}
          exact={exact}
          {...triggerProps}
        >
          <Avatar animate src={avatar} size="avatar_x4" />
          <ButtonText
            grow
            truncate
            color={active ? "default" : undefined}
            strong={active}
          >
            {isInvite ? "(Invite) " + name : name}
          </ButtonText>
          <Box shrink display={isSmall ? "none" : undefined} color="gray2">
            {pinned && <Icon type="pin" size="square_sm" padding="xs" />}
          </Box>
        </NavItem>
      )}
    </TooltipRenderer>
  );
};
