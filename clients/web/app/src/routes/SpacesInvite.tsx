import React, { useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import { useMatrixClient } from "use-matrix-client";
import { Box } from "@ui";
import { useSpaceDataStore } from "store/spaceDataStore";
import { InviteUserToRoomForm } from "@components/Web3";

export const SpacesInvite = () => {
  const { spaceId } = useParams();
  const { getSpaceData } = useSpaceDataStore();
  const { inviteUser } = useMatrixClient();
  const space = getSpaceData(spaceId);

  const navigate = useNavigate();

  const onCancelClicked = useCallback(async () => {
    navigate(spaceId ? "/spaces/" + spaceId : "/");
  }, [navigate, spaceId]);

  const onInviteClicked = useCallback(
    async (spaceId: string, inviteeUserId: string) => {
      await inviteUser(spaceId, inviteeUserId);
      navigate("/spaces/" + spaceId);
    },
    [inviteUser, navigate],
  );

  return (
    <Box grow padding="lg" gap="md">
      <InviteUserToRoomForm
        spaceName={space.name}
        spaceId={space.id}
        onCancelClicked={onCancelClicked}
        onInviteClicked={onInviteClicked}
      />
    </Box>
  );
};
