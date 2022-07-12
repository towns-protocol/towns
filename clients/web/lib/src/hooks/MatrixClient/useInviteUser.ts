import { MatrixContext } from "../../components/MatrixContextProvider";
import { MatrixClient } from "matrix-js-sdk";
import { useCallback, useContext } from "react";
import { RoomIdentifier, ZionContext } from "../../types/matrix-types";

export const useInviteUser = () => {
  const { matrixClient } = useContext<ZionContext>(MatrixContext);

  return useCallback(
    async (roomId: RoomIdentifier, userId: string) => {
      if (matrixClient) {
        await inviteZionUser({ matrixClient, roomId, userId });
        console.log(
          `Invited user ${userId} to join room ${roomId.matrixRoomId}`,
        );
      }
    },
    [matrixClient],
  );
};

export const inviteZionUser = async (props: {
  matrixClient: MatrixClient;
  roomId: RoomIdentifier;
  userId: string;
}) => {
  const { matrixClient, roomId, userId } = props;
  await matrixClient.invite(
    roomId.matrixRoomId,
    userId.toLowerCase(),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    function (err: any, data: any) {
      if (err) {
        console.error(err);
      }
    },
  );
};
