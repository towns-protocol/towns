import React, { useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { RoomIdentifier, useMatrixClient } from "use-matrix-client";
import { InviteUserToRoomForm } from "@components/Web3";
import { Stack } from "@ui";
import { useSpaceData } from "hooks/useSpaceData";

export const SpacesInvite = () => {
  const { spaceSlug } = useParams();
  const { inviteUser } = useMatrixClient();
  const space = useSpaceData(spaceSlug);

  const navigate = useNavigate();

  const onCancelClicked = useCallback(() => {
    navigate(space?.id.slug ? "/spaces/" + space.id.slug : "/");
  }, [navigate, space?.id.slug]);

  const onInviteClicked = useCallback(
    async (spaceId: RoomIdentifier, inviteeUserId: string) => {
      await inviteUser(spaceId, inviteeUserId);
      navigate("/spaces/" + spaceId.slug);
    },
    [inviteUser, navigate],
  );

  return (
    <Stack alignItems="center" height="100%">
      <Stack grow width="600">
        {space ? (
          <InviteUserToRoomForm
            spaceName={space.name}
            spaceId={space.id}
            onCancelClicked={onCancelClicked}
            onInviteClicked={onInviteClicked}
          />
        ) : (
          <div>404</div>
        )}
      </Stack>
    </Stack>
  );
};
