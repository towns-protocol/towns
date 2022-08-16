import { RoomIdentifier, useSpace, useZionClient } from "use-zion-client";
import { useNavigate, useParams } from "react-router-dom";

import { InviteForm } from "../components/InviteForm";
import { useCallback } from "react";

export function SpaceInvite() {
  const { spaceSlug } = useParams();
  const space = useSpace(spaceSlug);
  const navigate = useNavigate();
  const { inviteUser } = useZionClient();

  const onClickSendInvite = useCallback(
    async (spaceId: RoomIdentifier, inviteeId: string) => {
      await inviteUser(spaceId, inviteeId);
      navigate("/spaces/" + spaceSlug + "/");
    },
    [inviteUser, navigate, spaceSlug],
  );

  const onClickCancel = useCallback(async () => {
    navigate("/spaces/" + spaceSlug + "/");
  }, [navigate, spaceSlug]);

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
