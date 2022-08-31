import { useCallback } from "react";
import { useChannelId, useZionClient } from "use-zion-client";

export const useSendReply = (threadId?: string) => {
  const { sendMessage } = useZionClient();

  const channelId = useChannelId();
  const sendReply = useCallback(
    (value: string) => {
      if (value) {
        sendMessage(channelId, value, { threadId: threadId });
      }
      return sendReply;
    },
    [channelId, threadId, sendMessage],
  );

  return { sendReply };
};
