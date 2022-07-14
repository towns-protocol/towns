import { useCallback, useEffect, useMemo } from "react";
import {
  RoomMessage,
  useMatrixClient,
  useMatrixStore,
} from "use-matrix-client";
import { useSpaceData } from "./useSpaceData";

export const messageFilter = (m: RoomMessage) => !m.content?.["m.relates_to"];

/**
 * FIXME: this is an awful shortcut in order to get something on the screen
 * there's a few ways of doing this, by enabling `experimentalThreadSupport` in
 * the client or building a proper reducer looking up parent events recursively
 **/
export const useMessageThread = (channelSlug: string, messageId: string) => {
  const { allMessages } = useMatrixStore();

  const channelMessages = useMemo(
    () => (allMessages && channelSlug ? allMessages[channelSlug] ?? [] : []),
    [allMessages, channelSlug],
  );

  const parentMessage = useMemo(() => {
    return channelMessages?.find((m) => m.eventId === messageId);
  }, [channelMessages, messageId]);

  const messages = channelMessages.reduce((messages, m) => {
    const content = m.content;
    if (content) {
      const parent = content["m.relates_to"]?.event_id;
      if (
        parent === messageId &&
        !messages.some((s) => s.eventId === m.eventId)
      ) {
        return [...messages, m];
      }
    }
    return messages;
  }, [] as RoomMessage[]);

  useEffect(() => {
    console.log({ messages });
  }, [messages]);

  return {
    parentMessage,
    messages,
  };
};

export const useSendReply = (
  spaceSlug?: string,
  channelSlug?: string,
  parentId?: string,
) => {
  const { sendMessage } = useMatrixClient();

  const space = useSpaceData(spaceSlug);

  const channelGroup = useMemo(
    () =>
      space?.channelGroups.find((g) =>
        g.channels.find((c) => c.id.slug === channelSlug),
      ),
    [space?.channelGroups, channelSlug],
  );

  const channel = useMemo(
    () => channelGroup?.channels.find((c) => c.id.slug === channelSlug),
    [channelGroup?.channels, channelSlug],
  );
  const sendReply = useCallback(
    (value: string) => {
      if (value && channel?.id) {
        const threadId = parentId;
        sendMessage(channel?.id, value, threadId);
      }
      return sendReply;
    },
    [channel?.id, parentId, sendMessage],
  );

  return { sendReply };
};
