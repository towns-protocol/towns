import React from "react";
import { useMatrixStore, useMyProfile } from "use-zion-client";
import { Stack } from "ui/components/Stack/Stack";
import { LiquidContainer } from "./SpacesIndex";

export const MeIndex = () => {
  const { isAuthenticated, username, userId } = useMatrixStore();
  const myProfile = useMyProfile();
  if (!myProfile) {
    return <>"404"</>;
  }
  return (
    <Stack horizontal grow justifyContent="center" basis="1200">
      <LiquidContainer fullbleed position="relative">
        <Stack padding gap="lg" width="600">
          <Stack gap="md">
            <p>
              IsAuthenticated: <strong>{String(isAuthenticated)}</strong>
            </p>
            <p>
              DisplayName: <strong>{myProfile.displayName}</strong>
            </p>
            <p>
              AvatarUrl: <strong>{myProfile.avatarUrl}</strong>
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
