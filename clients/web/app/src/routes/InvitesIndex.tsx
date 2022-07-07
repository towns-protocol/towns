import React, { useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RoomIdentifier, useMatrixClient } from "use-matrix-client";
import { Box, Stack } from "@ui";
import { AcceptRoomInviteForm } from "@components/Web3";
import { useInviteData, useSpaces } from "hooks/useSpaceData";
import { ChannelGroup } from "data/ChannelData";
import { SpaceData } from "data/SpaceData";

export const InvitesIndex = () => {
  const { inviteSlug } = useParams();
  const { leaveRoom, joinRoom } = useMatrixClient();
  const navigate = useNavigate();
  const invite = useInviteData(inviteSlug);
  const spaces = useSpaces();

  const hasChannel = (channelGroup: ChannelGroup, id: RoomIdentifier) =>
    channelGroup.channels.some((c) => c.id.slug === id.slug);
  const hasChannelGroup = useCallback(
    (space: SpaceData, id: RoomIdentifier) =>
      space.channelGroups.some((channelGroup) => hasChannel(channelGroup, id)),
    [],
  );
  const getParentSpaceId = useCallback(
    (id: RoomIdentifier) => spaces.find((space) => hasChannelGroup(space, id)),
    [hasChannelGroup, spaces],
  );

  const onAccept = useCallback(async () => {
    if (!invite?.id) {
      console.error("onAccept Room Invite, space?.id undefined");
      return;
    }
    await joinRoom(invite.id);
    navigate(
      invite.isSpaceRoom
        ? "/spaces/" + invite.id.slug
        : "/" + getParentSpaceId(invite.id)?.id.slug + "/" + invite.id.slug,
    );
  }, [getParentSpaceId, invite, joinRoom, navigate]);

  const onDecline = useCallback(async () => {
    if (!invite?.id) {
      console.error("onDecline Room Invite, space undefined");
      return;
    }
    await leaveRoom(invite.id);
    navigate("/");
  }, [invite?.id, leaveRoom, navigate]);

  return (
    <>
      {invite ? (
        <>
          <Stack
            borderBottom
            grow
            alignItems="center"
            paddingBottom="none"
            position="relative"
            maxHeight="400"
          >
            <Box
              position="relative"
              width="100%"
              height="100%"
              alignItems="center"
              padding="lg"
              gap="md"
            >
              <AcceptRoomInviteForm
                spaceName={invite.name}
                onAcceptInviteClicked={onAccept}
                onDeclineInviteClicked={onDecline}
              />
            </Box>
          </Stack>
        </>
      ) : (
        <p>Invite "{inviteSlug}" not found</p>
      )}
    </>
  );
};
