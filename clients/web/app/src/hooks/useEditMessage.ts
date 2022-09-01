import { useCallback } from "react";
import { RoomIdentifier, useZionClient } from "use-zion-client";

export const useRedactChannelEvent = (channelId?: RoomIdentifier) => {
  // should be called "redact" I suppose
  const { editMessage } = useZionClient();

  const redactChannelEvent = useCallback(
    ({ value, parentId }: { value: string; parentId: string }) => {
      console.log({
        value,
        parentId,
        channelId,
      });

      if (value && parentId && channelId) {
        editMessage(channelId, value, { originalEventId: parentId });
      }
    },
    [channelId, editMessage],
  );

  return { redactChannelEvent };
};
