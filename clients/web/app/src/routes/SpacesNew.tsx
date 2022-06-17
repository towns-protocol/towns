import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Membership } from "use-matrix-client";
import { Box, Heading, Stack } from "@ui";
import { CreateSpaceForm } from "@components/Web3";

export const SpacesNew = () => {
  const navigate = useNavigate();

  const onCreateSpace = useCallback(
    (roomId: string, membership: Membership) => {
      navigate("/spaces/" + roomId);
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
