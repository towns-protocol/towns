import { Stack } from "@mui/material";
import { useMemo } from "react";
import { createUserIdFromString, useMatrixStore } from "use-matrix-client";

export const Me = () => {
  const { userId } = useMatrixStore();

  const userIdentifier = useMemo(() => {
    return userId ? createUserIdFromString(userId) : undefined;
  }, [userId]);

  return (
    <Stack>
      <p>
        My User ID: <strong>{userId}</strong>
      </p>
      <p>
        Matrix ID Localpart:{" "}
        <strong>{userIdentifier?.matrixUserIdLocalpart}</strong>
      </p>
      <p>
        Wallet Address: <strong>{userIdentifier?.accountAddress}</strong>
      </p>
      <p>
        Chain Agnostic ID: <strong>{userIdentifier?.chainAgnosticId}</strong>
      </p>
      <p>
        Chain ID: <strong>{userIdentifier?.chainId}</strong>
      </p>
    </Stack>
  );
};
