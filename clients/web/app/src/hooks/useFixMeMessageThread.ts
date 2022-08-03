import { useCallback, useEffect, useMemo } from "react";
import {
  RoomMessage,
  useChannel,
  useMatrixStore,
  useZionClient,
} from "use-zion-client";

export const messageFilter = (m: RoomMessage) => !m.content?.["m.relates_to"];

/**
 * TODO: https://github.com/HereNotThere/harmony/issues/203
 * FIXME: this is an awful shortcut in order to get something on the screen
 * there's a few ways of doing this, by enabling `experimentalThreadSupport` in
 * the client or building a proper reducer looking up parent events recursively
 **/
export const useMessageThread = (
  spaceSlug: string,
  channelSlug: string,
  messageId: string,
) => {
  const { allMessages } = useMatrixStore();

  const channel = useChannel(spaceSlug, channelSlug);

  const channelMessages = useMemo(
    () =>
      allMessages && channelSlug
        ? allMessages[channel?.id.slug ?? ""] ?? []
        : [],
    [allMessages, channel?.id.slug, channelSlug],
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

/**
 * Collect messages with replies
 * FIXME: rough implementation
 **/
export const useMessageReplyCount = (messages: RoomMessage[]) => {
  return useMemo(
    () =>
      messages.reduce((threads, m) => {
        const relatedTo = m.content?.["m.relates_to"]?.event_id;
        if (relatedTo) {
          threads[relatedTo] = threads[relatedTo] ? threads[relatedTo] + 1 : 1;
        }
        return threads;
      }, {} as { [key: string]: number }),
    [messages],
  );
};
