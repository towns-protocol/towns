import { Stack } from "@mui/material";
import { useMatrixStore } from "use-matrix-client";

export const Me = () => {
  const { userId } = useMatrixStore();
  return (
    <Stack>
      <p>
        My UserId: <strong>{userId}</strong>
      </p>
    </Stack>
  );
};
