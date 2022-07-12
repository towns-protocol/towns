import { MatrixContext } from "../../components/MatrixContextProvider";
import { useCallback, useContext } from "react";
import { RoomIdentifier, ZionContext } from "../../types/matrix-types";

export const useLeaveRoom = () => {
  const { matrixClient } = useContext<ZionContext>(MatrixContext);

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
