import React, { useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import {
  RoomIdentifier,
  useChannel,
  useSpace,
  useZionClient,
} from "use-zion-client";
import { Stack } from "@ui";
import { InviteUserToRoomForm } from "@components/Web3";

export const ChannelSettings = () => {
  const { spaceSlug, channelSlug } = useParams();
  const { inviteUser } = useZionClient();
  const navigate = useNavigate();
  const space = useSpace(spaceSlug);
  const channel = useChannel(spaceSlug, channelSlug);

  const onCancelClicked = useCallback(() => {
    navigate(
      "/spaces/" + space?.id.slug + "/channels/" + channel?.id.slug + "/",
    );
  }, [channel?.id.slug, navigate, space?.id.slug]);

  const onInviteClicked = useCallback(
    async (
      spaceId: RoomIdentifier,
      roomId: RoomIdentifier | undefined,
      inviteeUserId: string,
    ) => {
      await inviteUser(roomId ?? spaceId, inviteeUserId);
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
            roomName={channel?.label}
            roomId={channel?.id}
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
