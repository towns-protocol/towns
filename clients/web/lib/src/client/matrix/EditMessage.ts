import { MatrixClient, RelationType } from "matrix-js-sdk";
import {
  EditMessageOptions,
  MessageType,
  RoomIdentifier,
} from "../../types/matrix-types";

/**
 * https://github.com/uhoreg/matrix-doc/blob/b2457619ab3ac6199598d05a5e1b33dc51ab3ee1/proposals/2676-message-editing.md
 */
export const editZionMessage = async (props: {
  matrixClient: MatrixClient;
  roomId: RoomIdentifier;
  message: string;
  options: EditMessageOptions;
}) => {
  const { matrixClient, roomId, message, options } = props;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  const cb = function (err: any, res: any) {
    console.log("editZionMessage:done");
    if (err) {
      console.error(err);
    }
  };

  const content = {
    body: message,
    msgtype: MessageType.Text,
    "m.new_content": {
      "m.body": message,
      msgtype: "m.text",
    },
    "m.relates_to": {
      rel_type: RelationType.Replace,
      event_id: options.originalEventId,
    },
  };

  // send as edit
  await matrixClient.sendEvent(
    roomId.matrixRoomId,
    "m.room.message",
    content,
    "",
    cb,
  );
};
