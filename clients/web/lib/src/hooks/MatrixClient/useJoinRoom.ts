import { MatrixContext } from "../../components/MatrixContextProvider";
import { MatrixClient } from "matrix-js-sdk";
import { useCallback, useContext } from "react";
import { RoomIdentifier } from "../../types/matrix-types";

export const useJoinRoom = () => {
  const matrixClient = useContext<MatrixClient | undefined>(MatrixContext);

  return useCallback(
    async (roomId: RoomIdentifier) => {
      try {
        if (matrixClient) {
          await joinZionRoom({ matrixClient, roomId });
          console.log(`Joined room[${roomId.matrixRoomId}]`);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (ex: any) {
        console.error(`Error joining room[${roomId.matrixRoomId}]`, ex.stack);
      }
    },
    [matrixClient],
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
  await matrixClient.joinRoom(roomId.matrixRoomId, opts);
};
