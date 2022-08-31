import { useCallback } from "react";
import { RoomIdentifier, useZionClient } from "use-zion-client";

export const useEditMessage = (channelId: RoomIdentifier) => {
  const { editMessage } = useZionClient();

  const sendEditedMessage = useCallback(
    (value: string, parentId: string) => {
      if (value && parentId) {
        editMessage(channelId, value, { originalEventId: parentId });
      }
    },
    [channelId, editMessage],
  );

  return { sendEditedMessage };
};
