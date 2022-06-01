import React from "react";
import { useMatrixStore } from "use-matrix-client";
import { Heading } from "@ui";
import { Stack } from "ui/components/Stack/Stack";
import { LiquidContainer } from "./SpacesIndex";

export const MeIndex = () => {
  const { isAuthenticated, username, userId } = useMatrixStore();
  return (
    <Stack horizontal grow justifyContent="center" paddingY="lg" basis="1200">
      <LiquidContainer fullbleed position="relative">
        <Stack gap="lg" width="600">
          <Heading level={2}>Welcome </Heading>
          <Stack gap="md">
            <p>
              IsAuthenticated: <strong>{String(isAuthenticated)}</strong>
            </p>
            <p>
              UserName: <strong>{username}</strong>
            </p>
            <p>
              UserId: <strong>{userId}</strong>
            </p>
          </Stack>
        </Stack>
      </LiquidContainer>
    </Stack>
  );
};
