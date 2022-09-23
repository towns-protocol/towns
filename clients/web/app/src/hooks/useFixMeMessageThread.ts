import { useMemo } from "react";
import { TimelineEvent, ZTEvent, useChannelTimeline } from "use-zion-client";

export const useFilterReplies = (events: TimelineEvent[], bypass = false) => {
  const filteredEvents = useMemo(
    () =>
      bypass
        ? events
        : events.filter(
            (e: TimelineEvent) =>
              e.content?.kind !== ZTEvent.RoomMessage ||
              !e.content?.content["m.relates_to"]?.["m.in_reply_to"],
          ),
    [bypass, events],
  );

  return { filteredEvents };
};

/**
 * TODO: https://github.com/HereNotThere/harmony/issues/203
 * FIXME: this is an awful shortcut in order to get something on the screen
 * there's a few ways of doing this, by enabling `experimentalThreadSupport` in
 * the client or building a proper reducer looking up parent events recursively
 **/
export const useMessageThread = (messageId: string) => {
  const timeline = useChannelTimeline();

  const channelMessages = useMemo(
    () => timeline.filter((m) => m.content?.kind === ZTEvent.RoomMessage),
    [timeline],
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
  }, [] as TimelineEvent[]);

  return {
    parentMessage,
    messages,
  };
};

/**
 * Collect messages with replies
 * FIXME: rough implementation
 **/
export const useTimelineRepliesMap = (messages: TimelineEvent[]) => {
  return useMemo(
    () =>
      messages.reduce((threads, m) => {
        const reply = getMessageAsReply(m);
        const parentId = reply && reply["m.relates_to"].event_id;
        if (parentId) {
          threads.set(parentId, (threads.get(parentId) ?? 0) + 1);
        }
        return threads;
      }, new Map() as Map<string, number>),
    [messages],
  );
};

export type MessageRepliesMap = ReturnType<typeof useTimelineRepliesMap>;

const getMessageAsReply = (m: TimelineEvent) => {
  const content = m.content;
  const relatesTo =
    content?.kind === ZTEvent.RoomMessage
      ? content.content["m.relates_to"]
      : undefined;
  if (
    relatesTo &&
    relatesTo["m.in_reply_to"] &&
    relatesTo.rel_type === "io.element.thread"
  ) {
    return { ...m, "m.relates_to": { ...relatesTo } } as const;
  }
};
