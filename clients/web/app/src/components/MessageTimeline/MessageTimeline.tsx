import React, { createContext } from "react";
import {
  RoomIdentifier,
  TimelineEvent,
  ZTEvent,
  useMatrixStore,
} from "use-zion-client";
import { TimelineGenericEvent } from "./events/TimelineGenericEvent";
import {
  TimelineMessage,
  isRoomMessageContent,
} from "./events/TimelineMessage";
import { useTimelineMessageEditing } from "./hooks/useTimelineMessageEditing";

type Props = {
  events: TimelineEvent[];
  spaceId: RoomIdentifier;
  channelId: RoomIdentifier;
  messageRepliesMap?: { [key: string]: number };
};

export const TimelineMessageContext = createContext<null | ReturnType<
  typeof useTimelineMessageEditing
>>(null);

export const MessageTimeline = (props: Props) => {
  const { events, messageRepliesMap, channelId, spaceId } = props;
  const { userId } = useMatrixStore();
  const timelineActions = useTimelineMessageEditing();

  return (
    <TimelineMessageContext.Provider value={timelineActions}>
      {events.map((e, index) => {
        switch (e.content?.kind) {
          case ZTEvent.RoomMessage: {
            const prevousEvent = events[index - 1];
            const previousContent = isRoomMessageContent(prevousEvent);
            const minimal = previousContent?.sender.id === e.content.sender.id;
            return (
              <TimelineMessage
                channelId={channelId}
                spaceId={spaceId}
                event={e}
                minimal={minimal}
                own={e.content.sender.id === userId}
                editing={e.eventId === timelineActions.editingMessageId}
                replyCount={messageRepliesMap?.[e.eventId]}
                key={e.eventId}
              />
            );
          }
          case ZTEvent.RoomMember: {
            return <TimelineGenericEvent event={e} key={e.eventId} />;
          }
          case ZTEvent.RoomCreate: {
            return <TimelineGenericEvent event={e} key={e.eventId} />;
          }
          default: {
            return <TimelineGenericEvent event={e} key={e.eventId} />;
          }
        }
      })}
    </TimelineMessageContext.Provider>
  );
};
