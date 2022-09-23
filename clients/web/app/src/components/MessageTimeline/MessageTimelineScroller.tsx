import React, { useCallback, useRef } from "react";

import { RoomIdentifier, TimelineEvent, useZionClient } from "use-zion-client";
import { Stack } from "@ui";
import {
  useFilterReplies,
  useTimelineRepliesMap,
} from "hooks/useFixMeMessageThread";
import { useTimelineReactionsMap } from "hooks/useReactions";
import { useIsScrolling } from "./hooks/useIsScrolling";
import { useLazyLoad } from "./hooks/useLazyLoad";
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

  const { intersectionRef } = useLazyLoad(
    onLoadMore,
    containerRef,
    events.length,
  );

  const messageRepliesMap = useTimelineRepliesMap(events);
  const messageReactionsMap = useTimelineReactionsMap(events);
  const { filteredEvents } = useFilterReplies(events, !hideThreads);

  usePersistScrollPosition(containerRef, contentRef);
  useScrollDownOnNewMessage(containerRef, contentRef, filteredEvents);

  const { isScrolling } = useIsScrolling(containerRef.current);

  return (
    <>
      <Stack grow scroll ref={containerRef} style={{ overflowAnchor: "none" }}>
        <Stack grow style={{ minHeight: "min-content" }}>
          <Stack
            grow
            paddingY="md"
            justifyContent="end"
            ref={contentRef}
            pointerEvents={isScrolling ? "none" : "auto"}
          >
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
    </>
  );
};
