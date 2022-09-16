import React, { createContext } from "react";
import useEvent from "react-use-event-hook";
import {
  RoomIdentifier,
  TimelineEvent,
  useMatrixStore,
  useZionClient,
} from "use-zion-client";
import {
  useTimelineReactionsMap,
  useTimelineRepliesMap,
} from "hooks/useFixMeMessageThread";

import { Box, Stack } from "@ui";
import { TimelineGenericEvent } from "./events/TimelineGenericEvent";
import { TimelineMessage } from "./events/TimelineMessage";
import { RenderEventType, useGroupEvents } from "./hooks/useGroupEvents";
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
  const dateGroups = useGroupEvents(events);

  return (
    <TimelineMessageContext.Provider value={timelineActions}>
      {dateGroups.map((dateGroup) => {
        const renderEvents = dateGroup.events;
        return (
          <Stack key={dateGroup.date.humanDate} position="relative">
            <DateDivider label={dateGroup.date.humanDate} />
            {renderEvents.map((r, index) => {
              switch (r.type) {
                case RenderEventType.UserMessageGroup: {
                  const messagesByUser = r.events.map((e, index) => {
                    const minimal = index > 0;
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
                  });
                  const key = r.events[0]?.eventId;
                  return (
                    <Stack paddingY="sm" key={key}>
                      {messagesByUser}
                    </Stack>
                  );
                }

                case RenderEventType.RoomMember: {
                  return (
                    <TimelineGenericEvent
                      event={r.event}
                      key={r.event.eventId}
                    />
                  );
                }

                case RenderEventType.RoomCreate: {
                  return (
                    <TimelineGenericEvent
                      event={r.event}
                      key={r.event.eventId}
                    />
                  );
                }
                default: {
                  return null;
                }
              }
            })}
          </Stack>
        );
      })}
    </TimelineMessageContext.Provider>
  );
};

const DateDivider = (props: { label: string }) => (
  <>
    <Box left right top="md" position="absolute" paddingX="lg">
      <Box borderTop />
    </Box>
    <Box centerContent top="md" display="block" position="sticky" zIndex="ui">
      <Box centerContent>
        <Box
          border
          paddingY="sm"
          paddingX="md"
          rounded="md"
          background="default"
          color="gray2"
          fontSize="sm"
        >
          {props.label}
        </Box>
      </Box>
    </Box>
  </>
);
