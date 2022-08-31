import { RoomIdentifier, useSpaceData, useZionClient } from "use-zion-client";
import { useNavigate } from "react-router-dom";

import { InviteForm } from "../components/InviteForm";
import { useCallback } from "react";

export function SpaceInvite() {
  const space = useSpaceData();
  const navigate = useNavigate();
  const { inviteUser } = useZionClient();

  const onClickSendInvite = useCallback(
    async (spaceId: RoomIdentifier, inviteeId: string) => {
      await inviteUser(spaceId, inviteeId);
      navigate("/spaces/" + spaceId.slug + "/");
    },
    [inviteUser, navigate],
  );

  const onClickCancel = useCallback(async () => {
    navigate("/spaces/" + space?.id + "/");
  }, [navigate, space?.id]);

  return space ? (
    <InviteForm
      roomId={space.id}
      roomName={space.name}
      isSpace={true}
      sendInvite={onClickSendInvite}
      onClickCancel={onClickCancel}
    />
  ) : (
    <div>
      <h2>Space Not Found</h2>
    </div>
  );
}
