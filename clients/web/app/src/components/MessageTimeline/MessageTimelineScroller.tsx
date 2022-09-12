import React, { useCallback, useRef } from "react";

import { RoomIdentifier, TimelineEvent, useZionClient } from "use-zion-client";
import { Stack } from "@ui";
import {
  useFilterReplies,
  useTimelineReactionsMap,
  useTimelineRepliesMap,
} from "hooks/useFixMeMessageThread";
import { useLoadMore } from "./hooks/useLazyLoad";
import { usePersistScrollPosition } from "./hooks/usePersistScrollPosition";
import { useScrollDownOnNewMessage } from "./hooks/useScrollDownOnNewMessage";
import { MessageTimeline } from "./MessageTimeline";

interface Props {
  channelId: RoomIdentifier;
  spaceId: RoomIdentifier;
  events: TimelineEvent[];
  hideThreads?: boolean;
  before?: JSX.Element;
  after?: JSX.Element;
}

export const MessageTimelineScroller = (props: Props) => {
  const { spaceId, channelId, events, hideThreads } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const { scrollback } = useZionClient();

  const onLoadMore = useCallback(() => {
    scrollback(channelId);
  }, [channelId, scrollback]);

  const { intersectionRef } = useLoadMore(
    onLoadMore,
    containerRef,
    events.length,
  );

  const messageRepliesMap = useTimelineRepliesMap(events);
  const messageReactionsMap = useTimelineReactionsMap(events);
  const { filteredEvents } = useFilterReplies(events, !hideThreads);

  usePersistScrollPosition(containerRef, contentRef);
  useScrollDownOnNewMessage(containerRef, contentRef, filteredEvents);

  return (
    <Stack grow scroll ref={containerRef} style={{ overflowAnchor: "none" }}>
      <Stack grow style={{ minHeight: "min-content" }}>
        <Stack grow paddingY="md" justifyContent="end" ref={contentRef}>
          <div ref={intersectionRef} />
          <MessageTimeline
            channelId={channelId}
            spaceId={spaceId}
            events={filteredEvents}
            messageRepliesMap={messageRepliesMap}
            messageReactionsMap={messageReactionsMap}
          />
          {props.after}
        </Stack>
        <div ref={bottomRef} />
      </Stack>
    </Stack>
  );
};
