import React, { useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import { useMatrixClient } from "use-matrix-client";
import { Box, Stack } from "@ui";
import { useSpaceDataStore } from "store/spaceDataStore";
import { AcceptRoomInviteForm } from "@components/Web3";

export const InvitesIndex = () => {
  const { spaceId } = useParams();
  const { invites } = useSpaceDataStore();
  const { leaveRoom, joinRoom } = useMatrixClient();
  const navigate = useNavigate();

  const space = invites.find((s) => s.id === spaceId);

  const onAccept = useCallback(async () => {
    if (!spaceId) {
      console.error("onAccept Room Invite, spaceId undefined");
      return;
    }
    await joinRoom(spaceId);
    navigate("/spaces/" + spaceId);
  }, [spaceId, joinRoom, navigate]);

  const onDecline = useCallback(async () => {
    if (!spaceId) {
      console.error("onDecline Room Invite, spaceId undefined");
      return;
    }
    await leaveRoom(spaceId);
    navigate("/");
  }, [spaceId, leaveRoom, navigate]);

  return (
    <>
      {space ? (
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
                spaceName={space.name}
                onAcceptInviteClicked={onAccept}
                onDeclineInviteClicked={onDecline}
              />
            </Box>
          </Stack>
        </>
      ) : (
        <p>Invite "{spaceId}" not found</p>
      )}
    </>
  );
};
