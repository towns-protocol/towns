import { useMemo } from "react";
import { RoomMessage, useChannel, useMatrixStore } from "use-zion-client";

export const useFilterReplies = (messages: RoomMessage[], bypass = false) => {
  const filteredMessages = useMemo(
    () =>
      bypass
        ? messages
        : messages.filter(
            (m: RoomMessage) => !m.content?.["m.relates_to"]?.["m.in_reply_to"],
          ),
    [bypass, messages],
  );

  return { filteredMessages };
};

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
    const reply = getMessageAsReply(m);
    const parentId = reply && reply["m.relates_to"].event_id;
    if (
      parentId === messageId &&
      !messages.some((s) => s.eventId === m.eventId)
    ) {
      return [...messages, m];
    }
    return messages;
  }, [] as RoomMessage[]);

  return {
    parentMessage,
    messages,
  };
};

/**
 * Collect messages with replies
 * FIXME: rough implementation
 **/
export const useMessageReplyCount = (messages: RoomMessage[]) => {
  return useMemo(
    () =>
      messages.reduce((threads, m) => {
        const reply = getMessageAsReply(m);
        const parentId = reply && reply["m.relates_to"].event_id;
        if (parentId) {
          threads[parentId] = threads[parentId] ? threads[parentId] + 1 : 1;
        }
        return threads;
      }, {} as { [key: string]: number }),
    [messages],
  );
};

const getMessageAsReply = (m: RoomMessage) => {
  const content = m.content;
  const relatesTo = content?.["m.relates_to"];
  //?.["rel_type"] === "io.element.thread";
  if (
    relatesTo &&
    relatesTo["m.in_reply_to"] &&
    relatesTo.rel_type === "io.element.thread"
  ) {
    return { ...m, "m.relates_to": { ...relatesTo } } as const;
  }
};
