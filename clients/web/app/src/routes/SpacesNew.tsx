import React, { useCallback } from "react";
import { useNavigate } from "react-router";
import { Membership, useMatrixStore } from "use-matrix-client";
import { CreateRoomForm } from "@components/Web3";
import { Login } from "@components/Web3/Login";
import { Box } from "@ui";

export const SpacesNew = () => {
  const { isAuthenticated } = useMatrixStore();
  const navigate = useNavigate();

  const onCreateRoom = useCallback(
    (roomId: string, membership: Membership) => {
      console.log("room created", roomId, membership);
      navigate("spaces/" + roomId);
    },
    [navigate]
  );

  return (
    <>
      <Box border grow="h2" padding="lg" gap="md">
        {isAuthenticated ? (
          <CreateRoomForm onClick={onCreateRoom} />
        ) : (
          <Login />
        )}
      </Box>
    </>
  );
};
