import { useCallback } from "react";
import { useChannel, useZionClient } from "use-zion-client";

export const useEditMessage = (spaceSlug?: string, channelSlug?: string) => {
  const { editMessage } = useZionClient();

  const channel = useChannel(spaceSlug, channelSlug);

  const sendEditedMessage = useCallback(
    (value: string, parentId: string) => {
      if (value && channel?.id && parentId) {
        editMessage(channel?.id, value, { originalEventId: parentId });
      }
    },
    [channel?.id, editMessage],
  );

  return { sendEditedMessage };
};
