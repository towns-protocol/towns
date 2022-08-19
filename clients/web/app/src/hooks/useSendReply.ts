import { useCallback } from "react";
import { useChannel, useZionClient } from "use-zion-client";

export const useSendReply = (
  spaceSlug?: string,
  channelSlug?: string,
  threadId?: string,
) => {
  const { sendMessage } = useZionClient();

  const channel = useChannel(spaceSlug, channelSlug);
  const sendReply = useCallback(
    (value: string) => {
      if (value && channel?.id) {
        sendMessage(channel?.id, value, { threadId: threadId });
      }
      return sendReply;
    },
    [channel?.id, threadId, sendMessage],
  );

  return { sendReply };
};
