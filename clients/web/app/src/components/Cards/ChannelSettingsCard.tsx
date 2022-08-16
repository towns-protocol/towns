import React from "react";
import { useNavigate } from "react-router-dom";
import useEvent from "react-use-event-hook";
import { RoomIdentifier, useZionClient } from "use-zion-client";
import { Box, Card } from "@ui";
import { MenuItem } from "./SpaceSettingsCard";

type Props = {
  spaceId: RoomIdentifier;
  channelId: RoomIdentifier;
  channelName: string;
};

export const ChannelSettingsCard = (props: Props) => {
  const { channelId, spaceId, channelName } = props;

  const navigate = useNavigate();

  const onInviteClick = useEvent((e: React.MouseEvent) => {
    e.preventDefault();
    navigate(`/spaces/${spaceId.slug}/channels/${channelId.slug}/settings`);
  });

  const { leaveRoom } = useZionClient();

  const onLeaveClick = useEvent(async () => {
    await leaveRoom(channelId);
    navigate("/");
  });

  return (
    <Box position="relative">
      <Card border paddingY="sm" width="300" fontSize="md">
        <MenuItem icon="invite" onClick={onInviteClick}>
          Invite
        </MenuItem>
        <MenuItem icon="logout" color="cta1" onClick={onLeaveClick}>
          Leave {channelName}
        </MenuItem>
      </Card>
    </Box>
  );
};
