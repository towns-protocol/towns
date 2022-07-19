import { MatrixClient } from "matrix-js-sdk";
import { useCallback, useContext } from "react";
import { MatrixContext } from "../../components/MatrixContextProvider";
import {
  MessageType,
  RoomIdentifier,
  SendMessageOptions,
  ZionContext,
} from "../../types/matrix-types";

export const useSendMessage = () => {
  const { matrixClient } = useContext<ZionContext>(MatrixContext);

  return useCallback(
    async (
      roomId: RoomIdentifier,
      message: string,
      options: SendMessageOptions = {},
    ): Promise<void> => {
      if (matrixClient) {
        await sendZionMessage({
          matrixClient,
          roomId,
          message,
          options,
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
  options: SendMessageOptions;
}) => {
  const { matrixClient, roomId, message, options } = props;
  const content = {
    body: `${message}`,
    msgtype: options.messageType ?? MessageType.Text,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  const cb = function (err: any, res: any) {
    if (err) {
      console.error(err);
    }
  };

  if (!options.threadId) {
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
      options.threadId,
      "m.room.message",
      {
        ...content,
        "m.relates_to": {
          "m.in_reply_to": {
            event_id: options.threadId,
          },
        },
      },
      "",
      cb,
    );
  }
};
