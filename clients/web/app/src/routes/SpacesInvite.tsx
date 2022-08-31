import React, { useCallback } from "react";
import { useNavigate } from "react-router";
import { RoomIdentifier, useSpaceData, useZionClient } from "use-zion-client";
import { InviteUserToRoomForm } from "@components/Web3";
import { Stack } from "@ui";

export const SpacesInvite = () => {
  const { inviteUser } = useZionClient();
  const space = useSpaceData();

  const navigate = useNavigate();

  const onCancelClicked = useCallback(() => {
    navigate(space?.id.slug ? "/spaces/" + space.id.slug : "/");
  }, [navigate, space?.id.slug]);

  const onInviteClicked = useCallback(
    async (
      spaceId: RoomIdentifier,
      roomId: RoomIdentifier | undefined,
      inviteeUserId: string,
    ) => {
      await inviteUser(spaceId, inviteeUserId);
      navigate("/spaces/" + spaceId.slug + "/");
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
