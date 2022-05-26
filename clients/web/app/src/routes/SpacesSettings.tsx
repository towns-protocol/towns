import React, { useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import { useMatrixClient } from "use-matrix-client";
import { Box, Button } from "@ui";

export const SpacesSettings = () => {
  const { spaceId } = useParams();
  const { leaveRoom } = useMatrixClient();
  const navigate = useNavigate();

  const onInviteClicked = useCallback(() => {
    console.log("invite clicked");
    navigate("/spaces/" + spaceId + "/invite");
  }, [navigate, spaceId]);

  const onLeaveClicked = useCallback(async () => {
    console.log("leave clicked", spaceId);
    if (spaceId) {
      await leaveRoom(spaceId);
    }
    navigate("/");
  }, [leaveRoom, navigate, spaceId]);

  return (
    <Box grow padding="lg" gap="md">
      <h1> Settings </h1>
      <Button onClick={onInviteClicked}>Invite</Button>
      <Button onClick={onLeaveClicked}>Leave Room</Button>
    </Box>
  );
};
