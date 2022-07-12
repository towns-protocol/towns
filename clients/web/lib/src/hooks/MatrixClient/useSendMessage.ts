import { MatrixContext } from "../../components/MatrixContextProvider";
import { MatrixClient } from "matrix-js-sdk";
import { useCallback, useContext } from "react";
import { RoomIdentifier, ZionContext } from "../../types/matrix-types";

export const useSendMessage = () => {
  const { matrixClient } = useContext<ZionContext>(MatrixContext);

  return useCallback(
    async (roomId: RoomIdentifier, message: string): Promise<void> => {
      if (matrixClient) {
        await sendZionMessage({ matrixClient, roomId, message });
      }
    },
    [matrixClient],
  );
};

export const sendZionMessage = async (props: {
  matrixClient: MatrixClient;
  roomId: RoomIdentifier;
  message: string;
}) => {
  const { matrixClient, roomId, message } = props;
  const content = {
    body: `${message}`,
    msgtype: "m.text",
  };

  await matrixClient.sendEvent(
    roomId.matrixRoomId,
    "m.room.message",
    content,
    "",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
    function (err: any, res: any) {
      if (err) {
        console.error(err);
      }
    },
  );
};
