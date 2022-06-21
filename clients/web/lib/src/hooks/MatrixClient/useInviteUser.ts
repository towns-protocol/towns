import { MatrixContext } from "../../components/MatrixContextProvider";
import { MatrixClient } from "matrix-js-sdk";
import { useCallback, useContext } from "react";

export const useInviteUser = () => {
  const matrixClient = useContext<MatrixClient | undefined>(MatrixContext);

  return useCallback(
    async (roomId: string, userId: string) => {
      if (matrixClient) {
        await inviteZionUser({ matrixClient, roomId, userId });
        console.log(`Invited user ${userId} to join room ${roomId}`);
      }
    },
    [matrixClient],
  );
};

export const inviteZionUser = async (props: {
  matrixClient: MatrixClient;
  roomId: string;
  userId: string;
}) => {
  const { matrixClient, roomId, userId } = props;
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
};
