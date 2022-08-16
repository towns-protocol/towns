import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { RoomIdentifier, useZionClient } from "use-zion-client";
import { Icon, IconName } from "ui/components/Icon";
import { Box, BoxProps, Card, Icon, Stack } from "@ui";

type Props = { spaceId: RoomIdentifier; spaceName: string };

export const SpaceSettingsCard = (props: Props) => {
  const { spaceId } = props;

  const navigate = useNavigate();

  const onInviteClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      navigate(`/spaces/${spaceId.slug}/invite`);
    },
    [navigate, spaceId.slug],
  );

  const { leaveRoom } = useZionClient();
  const onLeaveClick = useCallback(async () => {
    await leaveRoom(spaceId);
    navigate("/");
  }, [leaveRoom, navigate, spaceId]);

  const onSettingsClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      navigate(`/spaces/${spaceId.slug}/settings`);
    },
    [navigate, spaceId.slug],
  );

  return (
    <Box position="relative">
      <Card border width="300" fontSize="md" paddingY="sm">
        <MenuItem icon="invite" onClick={onInviteClick}>
          Invite
        </MenuItem>
        <MenuItem icon="settings" onClick={onSettingsClick}>
          Settings
        </MenuItem>
        <MenuItem color="secondary" icon="logout" onClick={onLeaveClick}>
          Leave {props.spaceName}
        </MenuItem>
      </Card>
    </Box>
  );
};

export const MenuItem = ({
  children,
  ...props
}: BoxProps & { icon?: IconName }) => (
  <Box grow paddingY="sm" background={{ hover: "level3" }} {...props}>
    <Stack horizontal gap paddingX="md" cursor="pointer" alignItems="center">
      {props.icon && (
        <Icon
          color={props.color}
          type={props.icon}
          background="level3"
          size="square_lg"
          padding="sm"
        />
      )}
      {children}
    </Stack>
  </Box>
);
