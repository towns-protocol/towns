import { MatrixContext } from "../../components/MatrixContextProvider";
import { useCallback, useContext } from "react";
import {
  makeRoomIdentifier,
  RoomIdentifier,
  ZionContext,
} from "../../types/matrix-types";
import { useMatrixStore } from "../../store/use-matrix-store";

export const useJoinRoom = () => {
  const { client } = useContext<ZionContext>(MatrixContext);
  const { createRoom } = useMatrixStore();
  return useCallback(
    async (roomId: RoomIdentifier) => {
      try {
        if (client) {
          const room = await client.joinRoom(roomId);
          console.log(`Joined room[${roomId.matrixRoomId}]`, room);
          createRoom(makeRoomIdentifier(room.roomId), room.isSpaceRoom());
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (ex: any) {
        console.error(`Error joining room[${roomId.matrixRoomId}]`, ex.stack);
      }
    },
    [createRoom, client],
  );
};
