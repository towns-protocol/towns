import { useMatrixClient, useMatrixStore } from "use-matrix-client";
import React, { useCallback } from "react";
import { Button } from "@ui";

export function Logout(): JSX.Element | null {
  const { isAuthenticated } = useMatrixStore();
  const { logout } = useMatrixClient();

  const onLogout = useCallback(
    async function () {
      await logout();
    },
    [logout],
  );

  return isAuthenticated ? <Button onClick={onLogout}>Logout</Button> : null;
}
