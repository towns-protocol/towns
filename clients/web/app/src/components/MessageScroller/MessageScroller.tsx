import React, {
  RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useInView } from "react-intersection-observer";
import { RoomMessage } from "use-matrix-client";
import { Message } from "@components/Message";
import { RichTextPreview } from "@components/RichText/RichTextEditor";
import { Avatar, Stack } from "@ui";
import { FadeIn } from "@components/Transitions";

export const MessageScroller = (props: { messages: RoomMessage[] }) => {
  const { messages: allMessages } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const { ref, displayCount } = useLoadMore(
    containerRef,
    contentRef,
    allMessages.length,
  );
  const messages = allMessages.slice(-displayCount);

  const { endRef } = useMessageScroll(
    containerRef,
    messages[messages.length - 1]?.eventId,
    messages.find((m) => m.sender === "???" || true)?.eventId,
  );

  return (
    <Stack grow ref={containerRef} overflow="auto">
      <Stack grow style={{ minHeight: "min-content" }}>
        <Stack grow paddingY="md" justifyContent="end" ref={contentRef}>
          <div ref={ref} />
          {messages.map((m, index) => (
            <FadeIn key={m.eventId}>
              <Message
                name={m.sender}
                paddingX="lg"
                paddingY="md"
                avatar={
                  <Avatar src="/placeholders/nft_2.png" size="avatar_md" />
                }
                date="11:01AM"
              >
                <RichTextPreview content={m.body} />
              </Message>
            </FadeIn>
          ))}
        </Stack>
        <div ref={endRef} />
      </Stack>
    </Stack>
  );
};

const useLoadMore = (
  containerRef: RefObject<HTMLDivElement>,
  contentRef: RefObject<HTMLDivElement>,
  total: number,
) => {
  const [displayCount, setDisplayCount] = useState(10);
  const { ref, inView } = useInView({
    root: containerRef.current,
    rootMargin: "50%",
    threshold: 0,
  });

  const scrollDataRef = useRef<{ y: number; height: number }>();

  useEffect(() => {
    // console.log(`${displayCount} / ${total}`);
    if (inView && displayCount < total) {
      const timeout = setTimeout(() => {
        if (!contentRef.current || !containerRef.current) {
          return;
        }
        scrollDataRef.current = {
          y: containerRef.current?.scrollTop,
          height: containerRef.current.scrollHeight,
        };
        setDisplayCount((c) => c + 5);
      }, 500);
      return () => {
        clearTimeout(timeout);
      };
    }
  }, [containerRef, contentRef, displayCount, inView, total]);

  useLayoutEffect(() => {
    if (!contentRef.current || !containerRef.current) {
      return;
    }

    const prev = scrollDataRef.current;
    const height = containerRef.current.scrollHeight;

    if (prev) {
      const target = prev.y + height - prev.height;
      containerRef.current.scrollTo(0, target);
    } else {
      containerRef.current.scrollTo(0, height);
    }

    if (displayCount >= total) {
      return;
    }
  }, [containerRef, contentRef, displayCount, total]);
  return { ref, displayCount };
};

const useMessageScroll = (
  containerRef: RefObject<HTMLDivElement>,
  lastMessageId?: string,
  lastMessageByMeId?: string,
) => {
  const endRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    endRef.current?.scrollIntoView();
  }, [lastMessageId]);

  return { endRef, containerRef };
};
