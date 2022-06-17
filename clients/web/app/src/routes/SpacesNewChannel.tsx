import React, { useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Membership } from "use-matrix-client";
import { Box, Heading, Paragraph, Stack } from "@ui";
import { CreateChannelForm } from "@components/Web3";

export const SpacesNewChannel = () => {
  const navigate = useNavigate();
  const { spaceId } = useParams();

  const onCreateChannel = useCallback(
    (roomId: string, membership: Membership) => {
      if (spaceId) {
        navigate("/spaces/" + spaceId + "/" + roomId);
      }
    },
    [navigate, spaceId],
  );
  return (
    <Stack alignItems="center" height="100%">
      <Stack grow width="600">
        <Box paddingY="lg">
          <Heading level={2} textAlign="center">
            New Channel
          </Heading>
        </Box>
        {spaceId ? (
          <CreateChannelForm
            parentSpaceId={spaceId}
            onClick={onCreateChannel}
          />
        ) : (
          <Box centerContent gap="md" color="gray2">
            <Paragraph textAlign="center">Something went wrong</Paragraph>
          </Box>
        )}
      </Stack>
    </Stack>
  );
};
