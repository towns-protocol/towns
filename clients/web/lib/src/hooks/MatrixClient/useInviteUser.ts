import { MatrixContext } from "../../components/MatrixContextProvider";
import { MatrixClient } from "matrix-js-sdk";
import { useCallback, useContext } from "react";

export const useInviteUser = () => {
  const matrixClient = useContext<MatrixClient | undefined>(MatrixContext);

  return useCallback(
    async (roomId: string, userId: string) => {
      if (matrixClient) {
        await matrixClient.invite(
          roomId,
          userId.toLowerCase(),
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
          function (err: any, data: any) {
            if (err) {
              console.error(err);
            }
          },
        );
        console.log(`Invited user ${userId} to join room ${roomId}`);
      }
    },
    [matrixClient],
  );
};
