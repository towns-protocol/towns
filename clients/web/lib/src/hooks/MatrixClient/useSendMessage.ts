import { MatrixClient } from "matrix-js-sdk";
import { useCallback, useContext } from "react";
import { MatrixContext } from "../../components/MatrixContextProvider";
import { RoomIdentifier, ZionContext } from "../../types/matrix-types";

export const useSendMessage = () => {
  const { matrixClient } = useContext<ZionContext>(MatrixContext);

  return useCallback(
    async (
      roomId: RoomIdentifier,
      message: string,
      parentId?: string,
      messageType = "m.text",
    ): Promise<void> => {
      if (matrixClient) {
        await sendZionMessage({
          matrixClient,
          roomId,
          message,
          parentId,
          messageType,
        });
      }
    },
    [matrixClient],
  );
};

/** treat message as a reply to parentId if specified */
export const sendZionMessage = async (props: {
  matrixClient: MatrixClient;
  roomId: RoomIdentifier;
  message: string;
  parentId?: string;
  messageType: string;
}) => {
  const { matrixClient, roomId, message, parentId, messageType } = props;
  const content = {
    body: `${message}`,
    msgtype: messageType,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  const cb = function (err: any, res: any) {
    if (err) {
      console.error(err);
    }
  };

  if (!parentId) {
    await matrixClient.sendEvent(
      roomId.matrixRoomId,
      "m.room.message",
      content,
      "",
      cb,
    );
  } else {
    // send as reply
    await matrixClient.sendEvent(
      roomId.matrixRoomId,
      parentId,
      "m.room.message",
      {
        ...content,
        "m.relates_to": {
          "m.in_reply_to": {
            event_id: parentId,
          },
        },
      },
      "",
      cb,
    );
  }
};
