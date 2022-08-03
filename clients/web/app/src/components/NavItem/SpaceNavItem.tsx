import React, { useCallback } from "react";
import { RoomIdentifier } from "use-zion-client";
import { SpaceSettingsCard } from "@components/Cards/SpaceSettingsCard";
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
  settings?: boolean;
  onSettings?: (id: RoomIdentifier) => void;
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
  const {
    id,
    active,
    avatar,
    exact,
    name,
    pinned,
    settings,
    onSettings,
    isInvite,
  } = props;

  const sizeContext = useSizeContext();
  // TODO: use tokens
  const isSmall = sizeContext.lessThan(180);

  const onSettingClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      onSettings?.(id);
    },
    [onSettings, id],
  );

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
          to={isInvite ? `/invites/${id.slug}/` : `/spaces/${id.slug}/`}
          exact={exact}
          {...triggerProps}
        >
          <Avatar animate src={avatar} size="avatar_x4" type="space" />
          <ButtonText
            grow
            truncate
            color={active ? "default" : "gray1"}
            strong={active}
          >
            {isInvite ? "(Invite) " + name : name}
          </ButtonText>
          <Box shrink display={isSmall ? "none" : undefined} color="gray2">
            {pinned && <Icon type="pin" size="square_sm" padding="xs" />}
          </Box>
          {settings && (
            <TooltipRenderer
              trigger="click"
              placement="horizontal"
              render={<SpaceSettingsCard spaceId={id} />}
              layoutId="settings"
            >
              {({ triggerProps }) => (
                <Box
                  shrink
                  display={isSmall ? "none" : undefined}
                  color={{ hover: "default", default: "gray2" }}
                  onClick={onSettingClick}
                  {...triggerProps}
                >
                  <Icon type="settings" size="square_sm" />
                </Box>
              )}
            </TooltipRenderer>
          )}
        </NavItem>
      )}
    </TooltipRenderer>
  );
};
