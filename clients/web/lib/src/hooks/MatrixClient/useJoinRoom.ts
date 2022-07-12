import { MatrixContext } from "../../components/MatrixContextProvider";
import { MatrixClient } from "matrix-js-sdk";
import { useCallback, useContext } from "react";
import {
  makeRoomIdentifier,
  RoomIdentifier,
  ZionContext,
} from "../../types/matrix-types";
import { useMatrixStore } from "../../store/use-matrix-store";

export const useJoinRoom = () => {
  const { matrixClient } = useContext<ZionContext>(MatrixContext);
  const { createRoom } = useMatrixStore();
  return useCallback(
    async (roomId: RoomIdentifier) => {
      try {
        if (matrixClient) {
          const room = await joinZionRoom({ matrixClient, roomId });
          console.log(`Joined room[${roomId.matrixRoomId}]`, room);
          createRoom(makeRoomIdentifier(room.roomId), room.isSpaceRoom());
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (ex: any) {
        console.error(`Error joining room[${roomId.matrixRoomId}]`, ex.stack);
      }
    },
    [createRoom, matrixClient],
  );
};

export const joinZionRoom = async (props: {
  matrixClient: MatrixClient;
  roomId: RoomIdentifier;
}) => {
  const { matrixClient, roomId } = props;
  const opts = {
    syncRoom: true,
  };
  return await matrixClient.joinRoom(roomId.matrixRoomId, opts);
};
