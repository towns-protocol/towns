import { MatrixContext } from "../../components/MatrixContextProvider";
import { MatrixClient } from "matrix-js-sdk";
import { useCallback, useContext } from "react";

export const useJoinRoom = () => {
  const matrixClient = useContext<MatrixClient | undefined>(MatrixContext);

  return useCallback(
    async (roomId: string) => {
      try {
        if (matrixClient) {
          await joinZionRoom({ matrixClient, roomId });
          console.log(`Joined room[${roomId}]`);
        }
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } catch (ex: any) {
        console.error(`Error joining room[${roomId}]`, ex.stack);
      }
    },
    [matrixClient],
  );
};

export const joinZionRoom = async (props: {
  matrixClient: MatrixClient;
  roomId: string;
}) => {
  const { matrixClient, roomId } = props;
  const opts = {
    syncRoom: true,
  };
  await matrixClient.joinRoom(roomId, opts);
};
