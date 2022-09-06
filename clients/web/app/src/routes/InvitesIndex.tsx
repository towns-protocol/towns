import React, { useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import { useInviteData, useZionClient } from "use-zion-client";
import { Box, Stack } from "@ui";
import { AcceptRoomInviteForm } from "@components/Web3";

export const InvitesIndex = () => {
  const { inviteSlug } = useParams();
  const { leaveRoom, joinRoom } = useZionClient();
  const navigate = useNavigate();
  const invite = useInviteData(inviteSlug);

  const onAccept = useCallback(async () => {
    if (!invite?.id) {
      console.error("onAccept Room Invite, space?.id undefined");
      return;
    }
    await joinRoom(invite.id);
    navigate(
      invite.isSpaceRoom
        ? "/spaces/" + invite.id.slug + "/"
        : "/" +
            invite.spaceParentId?.slug +
            "/channels/" +
            invite.id.slug +
            "/",
    );
  }, [invite, joinRoom, navigate]);

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
        <p>Invite &quot;{inviteSlug}&quot; not found</p>
      )}
    </>
  );
};
