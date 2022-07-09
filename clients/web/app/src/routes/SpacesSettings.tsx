import React, { useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMatrixClient, useSpaceId } from "use-matrix-client";
import { Box, Button, Heading, Stack } from "@ui";

export const SpacesSettings = () => {
  const { spaceSlug } = useParams();
  const { leaveRoom } = useMatrixClient();
  const navigate = useNavigate();
  const spaceId = useSpaceId(spaceSlug);

  const onInviteClicked = useCallback(() => {
    console.log("invite clicked");
    navigate("/spaces/" + spaceId?.slug + "/invite");
  }, [navigate, spaceId?.slug]);

  const onLeaveClicked = useCallback(async () => {
    console.log("leave clicked", spaceId);
    if (spaceId) {
      await leaveRoom(spaceId);
    }
    navigate("/");
  }, [leaveRoom, navigate, spaceId]);

  return (
    <Stack horizontal padding="lg" gap="md">
      <Box shrink gap>
        <Heading>Settings</Heading>
        <Button onClick={onInviteClicked}>Invite</Button>
        <Button onClick={onLeaveClicked}>Leave Room</Button>
      </Box>
    </Stack>
  );
};
