import React, { createContext } from "react";
import {
  RoomIdentifier,
  TimelineEvent,
  ZTEvent,
  useMatrixStore,
  useZionClient,
} from "use-zion-client";
import useEvent from "react-use-event-hook";
import {
  useTimelineReactionsMap,
  useTimelineRepliesMap,
} from "hooks/useFixMeMessageThread";

import { getIsRoomMessageContent } from "utils/ztevent_util";
import { TimelineGenericEvent } from "./events/TimelineGenericEvent";
import { TimelineMessage } from "./events/TimelineMessage";
import { useTimelineMessageEditing } from "./hooks/useTimelineMessageEditing";

type Props = {
  events: TimelineEvent[];
  spaceId: RoomIdentifier;
  channelId: RoomIdentifier;
  messageRepliesMap?: ReturnType<typeof useTimelineRepliesMap>;
  messageReactionsMap?: ReturnType<typeof useTimelineReactionsMap>;
};

export const TimelineMessageContext = createContext<null | ReturnType<
  typeof useTimelineMessageEditing
>>(null);

export const MessageTimeline = (props: Props) => {
  const { events, messageRepliesMap, messageReactionsMap, channelId, spaceId } =
    props;
  const { userId } = useMatrixStore();

  const timelineActions = useTimelineMessageEditing();
  const { sendReaction } = useZionClient();
  const onReaction = useEvent((eventId: string, reaction: string) => {
    sendReaction(channelId, eventId, reaction);
  });

  return (
    <TimelineMessageContext.Provider value={timelineActions}>
      {events.map((e, index) => {
        switch (e.content?.kind) {
          case ZTEvent.RoomMessage: {
            const prevousEvent = events[index - 1];
            const previousContent = getIsRoomMessageContent(prevousEvent);
            const minimal = previousContent?.sender.id === e.content.sender.id;
            const reactions = messageReactionsMap?.get(e.eventId);
            return (
              <TimelineMessage
                userId={userId}
                channelId={channelId}
                spaceId={spaceId}
                event={e}
                eventContent={e.content}
                minimal={minimal}
                own={e.content.sender.id === userId}
                editing={e.eventId === timelineActions.editingMessageId}
                replies={messageRepliesMap?.get(e.eventId)}
                reactions={reactions}
                key={e.eventId}
                onReaction={onReaction}
              />
            );
          }
          case ZTEvent.Reaction: {
            return null;
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
