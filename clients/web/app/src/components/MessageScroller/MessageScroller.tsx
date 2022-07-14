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
import { FadeIn } from "@components/Transitions";
import { Avatar, Box, Stack } from "@ui";
import {
  messageFilter,
  useMessageReplyCount,
} from "hooks/useFixMeMessageThread";

const INITIAL_MESSAGE_COUNT = 15;
const USER_AVATARS = [
  "/placeholders/nft_1.png",
  "/placeholders/nft_2.png",
  "/placeholders/nft_3.png",
  "/placeholders/nft_4.png",
  "/placeholders/nft_5.png",
  "/placeholders/nft_6.png",
  "/placeholders/nft_7.png",
  "/placeholders/nft_8.png",
  "/placeholders/nft_9.png",
  "/placeholders/nft_10.png",
  "/placeholders/nft_11.png",
  "/placeholders/nft_12.png",
  "/placeholders/nft_13.png",
  "/placeholders/nft_14.png",
  "/placeholders/nft_15.png",
  "/placeholders/nft_16.png",
  "/placeholders/nft_17.png",
  "/placeholders/nft_18.png",
  "/placeholders/nft_19.png",
  "/placeholders/nft_20.png",
  "/placeholders/nft_21.png",
  "/placeholders/nft_22.png",
  "/placeholders/nft_23.png",
  "/placeholders/nft_24.png",
  "/placeholders/nft_25.png",
  "/placeholders/nft_26.png",
  "/placeholders/nft_27.png",
  "/placeholders/nft_28.png",
  "/placeholders/nft_29.png",
  "/placeholders/nft_30.png",
  "/placeholders/nft_31.png",
  "/placeholders/nft_32.png",
  "/placeholders/nft_33.png",
  "/placeholders/nft_34.png",
];

export const MessageScroller = (props: {
  messages: RoomMessage[];
  onSelectMessage?: (id: string) => void;
  hideThreads?: boolean;
  before?: JSX.Element;
}) => {
  const { messages } = props;

  const userAvatars = useRef<{ [userId: string]: string }>({});
  const userAvatarIndex = useRef<number>(0);
  const getUserAvatar = (userId: string) => {
    let avatar = userAvatars.current[userId];
    if (!avatar) {
      avatar = USER_AVATARS[userAvatarIndex.current];
      userAvatars.current[userId] = avatar;
      userAvatarIndex.current =
        (userAvatarIndex.current + 1) % USER_AVATARS.length;
    }
    return avatar;
  };

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const { ref, displayCount } = useLoadMore(
    containerRef,
    contentRef,
    messages.length,
  );

  const filteredMessages = props.hideThreads
    ? messages.filter(messageFilter)
    : messages;

  const paginatedMessages = filteredMessages.slice(-displayCount);

  const { endRef } = useMessageScroll(
    containerRef,
    paginatedMessages[paginatedMessages.length - 1]?.eventId,
  );

  const repliedMessages = useMessageReplyCount(messages);

  return (
    <Stack grow ref={containerRef} overflow="auto">
      <Stack grow style={{ minHeight: "min-content" }}>
        <Stack grow paddingY="md" justifyContent="end" ref={contentRef}>
          <div ref={ref} />
          {paginatedMessages.map((m, index) => (
            <FadeIn
              fast
              key={m.eventId}
              disabled={
                index > paginatedMessages.length - INITIAL_MESSAGE_COUNT
              }
            >
              <Message
                id={m.eventId}
                name={m.sender}
                paddingX="lg"
                paddingY="md"
                avatar={
                  <Avatar src={getUserAvatar(m.sender)} size="avatar_md" />
                }
                date="11:01AM"
                onSelectMessage={props.onSelectMessage}
              >
                <RichTextPreview content={m.body} />
                {repliedMessages[m.eventId] && (
                  <Box horizontal paddingY="sm">
                    <Box
                      shrink
                      centerContent
                      horizontal
                      gap="sm"
                      paddingY="sm"
                      paddingX="sm"
                      background="level2"
                      rounded="xs"
                    >
                      <Avatar size="avatar_sm" />
                      {repliedMessages[m.eventId]} $
                      {repliedMessages[m.eventId] > 1 ? "Replies" : "Reply"}
                    </Box>
                  </Box>
                )}
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
  const [displayCount, setDisplayCount] = useState(INITIAL_MESSAGE_COUNT);
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
