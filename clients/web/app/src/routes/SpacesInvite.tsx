import React, { useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMatrixClient } from "use-matrix-client";
import { InviteUserToRoomForm } from "@components/Web3";
import { Stack } from "@ui";
import { useSpaceDataStore } from "store/spaceDataStore";

export const SpacesInvite = () => {
  const { spaceId } = useParams();
  const { getSpaceData } = useSpaceDataStore();
  const { inviteUser } = useMatrixClient();
  const space = getSpaceData(spaceId);

  const navigate = useNavigate();

  const onCancelClicked = useCallback(() => {
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
    <Stack alignItems="center" height="100%">
      <Stack grow width="600">
        <InviteUserToRoomForm
          spaceName={space.name}
          spaceId={space.id}
          onCancelClicked={onCancelClicked}
          onInviteClicked={onInviteClicked}
        />
      </Stack>
    </Stack>
  );
};
