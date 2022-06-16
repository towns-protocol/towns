import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Membership, useMatrixStore } from "use-matrix-client";
import { Box, Heading, Paragraph, Stack } from "@ui";
import { CreateSpaceForm } from "@components/Web3";
import { Login } from "@components/Web3/Login";

export const SpacesNew = () => {
  const { isAuthenticated } = useMatrixStore();
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
        {isAuthenticated ? (
          <CreateSpaceForm onClick={onCreateSpace} />
        ) : (
          <Box centerContent gap="md" color="gray2">
            <Paragraph textAlign="center">Please sign-in to continue</Paragraph>
            <Login />
          </Box>
        )}
      </Stack>
    </Stack>
  );
};
