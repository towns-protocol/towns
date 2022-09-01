import React, {
  RefObject,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useInView } from "react-intersection-observer";
import { RoomIdentifier, TimelineEvent, useZionClient } from "use-zion-client";
import { Button, Stack } from "@ui";
import {
  useFilterReplies,
  useMessageReplyCount,
} from "hooks/useFixMeMessageThread";
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
  const { spaceId, channelId, events } = props;
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const { scrollback } = useZionClient();
  const onLoadMore = useCallback(() => {
    scrollback(channelId);
  }, [channelId, scrollback]);

  const { ref, LoadMore } = useLoadMore(
    onLoadMore,
    containerRef,
    contentRef,
    events.length,
  );

  const repliedEvents = useMessageReplyCount(events);

  // strip-out replies on main timeline (hack!)
  const { filteredMessages } = useFilterReplies(events, !props.hideThreads);

  const messages = useResetScroll(filteredMessages, containerRef);

  /* FIXME: cancels lazy reveal of messages */
  const { endRef } = useMessageScroll(
    containerRef,
    messages[messages.length - 1]?.eventId,
  );

  return (
    <Stack grow ref={containerRef} overflow="auto">
      <Stack grow style={{ minHeight: "min-content" }}>
        <Stack grow paddingY="md" justifyContent="end" ref={contentRef}>
          <div ref={ref} />
          {props.before}
          {LoadMore}
          <MessageTimeline
            channelId={channelId}
            spaceId={spaceId}
            events={messages}
            messageRepliesMap={repliedEvents}
          />
          {props.after}
        </Stack>
        <div ref={endRef} />
      </Stack>
    </Stack>
  );
};

const useLoadMore = (
  onLoadMore: () => void,
  containerRef: RefObject<HTMLDivElement>,
  contentRef: RefObject<HTMLDivElement>,
  total: number,
) => {
  const [currentWatermark, setCurrentWatermark] = useState(total);
  const { ref, inView } = useInView({
    root: containerRef.current,
    rootMargin: "0%",
    threshold: 0,
  });

  const triggerLoading = useCallback(() => {
    setCurrentWatermark(total);
    onLoadMore();
  }, [onLoadMore, total]);

  const isLoaded = currentWatermark === total;

  const LoadMore = (
    <Stack padding horizontal centerContent>
      <Button
        animate={false}
        tone={!isLoaded ? "cta1" : "level2"}
        onClick={!isLoaded ? triggerLoading : undefined}
      >
        Load More
      </Button>
    </Stack>
  );

  useEffect(() => {
    const isLoaded = currentWatermark === total;
    if (inView && !isLoaded) {
      const timeout = setTimeout(() => {
        // triggerLoading();
      }, 2000);
      return () => {
        clearTimeout(timeout);
      };
    }
  }, [currentWatermark, inView, total, triggerLoading]);

  return { ref, LoadMore };
};

const useResetScroll = (
  events: TimelineEvent[],
  containerRef: RefObject<HTMLDivElement>,
) => {
  const scrollDataRef = useRef<{ scrollY: number; height: number }>();
  const numEvents = events.length;
  const [totalDisplay, setTotalDisplay] = useState(numEvents);

  const newEvents = useMemo(
    () => events.slice().reverse().slice(0, totalDisplay).reverse(),
    [events, totalDisplay],
  );
  useEffect(() => {
    if (numEvents !== totalDisplay) {
      const scrollY = containerRef.current?.scrollTop ?? 0;
      const height = containerRef.current?.scrollHeight ?? 0;
      scrollDataRef.current = {
        scrollY,
        height,
      };
      setTotalDisplay(numEvents);
    }
  }, [containerRef, numEvents, totalDisplay]);

  useLayoutEffect(() => {
    const height = containerRef.current?.scrollHeight;
    const prev = scrollDataRef.current;

    if (containerRef.current && height && prev) {
      const target = height - prev.height;
      containerRef.current.scrollBy(0, target);
    }
  }, [containerRef, totalDisplay]);

  return newEvents;
};

const useMessageScroll = (
  containerRef: RefObject<HTMLDivElement>,
  lastMessageId?: string,
) => {
  const endRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    endRef.current?.scrollIntoView();
  }, [lastMessageId]);

  return { endRef, containerRef };
};
