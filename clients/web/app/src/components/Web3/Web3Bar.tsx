import React, { useMemo } from "react";
import { getShortUsername, useMatrixStore } from "use-matrix-client";
import { Stack } from "@ui";
import { Login } from "@components/Web3/Login";
import { Logout } from "@components/Web3/Logout";

export const Web3Bar = () => {
  const { isAuthenticated, username } = useMatrixStore();

  const myWalletAddress = useMemo(() => {
    if (username) {
      return getShortUsername(username);
    }
  }, [username]);

    return (
        <Stack
            borderBottom
            direction="row"
            shrink={false}
            height="height_xl"
            paddingX="md"
            background="level1"
            alignItems="center"
            gap="md"
            color="gray2"
            position="sticky"
            style={{ top: 0, zIndex: 10 }}
        >
            {isAuthenticated ? (
        <Stack direction="row" paddingX="md" gap="md" alignItems="center">
          <p>"You're Authenticated to Web3! ({myWalletAddress})" </p>
          <Logout />
        </Stack>
            ) : (
                <Login />
            )}
        </Stack>
    );
};
