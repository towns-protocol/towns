import { MatrixContext } from "../../components/MatrixContextProvider";
import { MatrixClient } from "matrix-js-sdk";
import { useCallback, useContext } from "react";

export const useLeaveRoom = () => {
  const matrixClient = useContext<MatrixClient | undefined>(MatrixContext);

  return useCallback(
    async (roomId: string) => {
      if (matrixClient) {
        await matrixClient.leave(roomId);
        console.log(`Left room ${roomId}`);
      }
    },
    [matrixClient],
  );
};
