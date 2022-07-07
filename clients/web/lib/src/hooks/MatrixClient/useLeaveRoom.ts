import { MatrixContext } from "../../components/MatrixContextProvider";
import { MatrixClient } from "matrix-js-sdk";
import { useCallback, useContext } from "react";
import { RoomIdentifier } from "../../types/matrix-types";

export const useLeaveRoom = () => {
  const matrixClient = useContext<MatrixClient | undefined>(MatrixContext);

  return useCallback(
    async (roomId: RoomIdentifier) => {
      if (matrixClient) {
        await matrixClient.leave(roomId.matrixRoomId);
        console.log(`Left room ${roomId.matrixRoomId}`);
      }
    },
    [matrixClient],
  );
};
