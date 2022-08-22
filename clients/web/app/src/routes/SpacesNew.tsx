import React, { useCallback } from "react";
import { useNavigate } from "react-router";
import { Membership, RoomIdentifier } from "use-zion-client";
import { Box, Heading, Stack } from "@ui";
import { CreateSpaceForm } from "@components/Web3";

export const SpacesNew = () => {
  const navigate = useNavigate();

  const onCreateSpace = useCallback(
    (roomId: RoomIdentifier, membership: Membership) => {
      navigate("/spaces/" + roomId.slug + "/");
    },
    [navigate],
  );
  return (
    <Stack alignItems="center" height="100%">
      <Stack grow width="600">
        <Box paddingY="lg">
          <Heading level={2} textAlign="center">
            New Space
          </Heading>
        </Box>
        <CreateSpaceForm onClick={onCreateSpace} />
      </Stack>
    </Stack>
  );
};
