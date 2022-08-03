import { useMatrixStore, useZionClient } from "use-zion-client";
import React, { useCallback } from "react";
import { Button } from "@ui";

export const Logout = () => {
  const { isAuthenticated } = useMatrixStore();
  const { logout } = useZionClient();

  const onLogout = useCallback(async () => {
    await logout();
  }, [logout]);

  return isAuthenticated ? <Button onClick={onLogout}>Logout</Button> : null;
};
