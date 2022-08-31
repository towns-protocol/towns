import React, { useCallback } from "react";
import { useNavigate } from "react-router";
import { Membership, RoomIdentifier, useSpaceId } from "use-zion-client";
import { Box, Heading, Paragraph, Stack } from "@ui";
import { CreateChannelForm } from "@components/Web3";

export const SpacesNewChannel = () => {
  const navigate = useNavigate();
  const spaceId = useSpaceId();

  const onCreateChannel = useCallback(
    (roomId: RoomIdentifier, membership: Membership) => {
      if (spaceId?.slug) {
        navigate("/spaces/" + spaceId.slug + "/channels/" + roomId.slug + "/");
      }
    },
    [navigate, spaceId?.slug],
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
