import { MatrixContext } from "../../components/MatrixContextProvider";
import { MatrixClient } from "matrix-js-sdk";
import { useCallback, useContext } from "react";

export const useJoinRoom = () => {
  const matrixClient = useContext<MatrixClient | undefined>(MatrixContext);

  return useCallback(
    async (roomId: string) => {
      const opts = {
        syncRoom: true,
      };

      try {
        if (matrixClient) {
          await matrixClient.joinRoom(roomId, opts);
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
