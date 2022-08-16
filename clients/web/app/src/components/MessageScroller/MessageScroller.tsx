import React, {
  RefObject,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useInView } from "react-intersection-observer";
import useEvent from "react-use-event-hook";
import { MessageType, RoomMessage } from "use-zion-client";
import { Message } from "@components/Message";
import {
  RichTextEditor,
  RichTextPreview,
} from "@components/RichText/RichTextEditor";
import { FadeIn } from "@components/Transitions";
import { Avatar, Box, Button, Stack } from "@ui";
import {
  messageFilter,
  useMessageReplyCount,
} from "hooks/useFixMeMessageThread";

const INITIAL_MESSAGE_COUNT = 15;

export const MessageScroller = (props: {
  messages: RoomMessage[];
  onSelectMessage?: (id: string) => void;
  hideThreads?: boolean;
  before?: JSX.Element;
}) => {
  const { messages } = props;

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
  const [editMessageId, setEditMessageId] = useState<string>();
  const onEditMessage = useEvent((messageId: string) => {
    setEditMessageId(() =>
      editMessageId === messageId ? undefined : messageId,
    );
  });

  const onSaveEditedMessage = (value: string) => {
    // saveMessage(editMessageId, value);
    setEditMessageId(undefined);
  };

  const onCancelEdit = useEvent(() => {
    setEditMessageId(undefined);
  });

  return (
    <Stack grow ref={containerRef} overflow="auto">
      <Stack grow style={{ minHeight: "min-content" }}>
        <Stack grow paddingY="md" justifyContent="end" ref={contentRef}>
          <div ref={ref} />
          {props.before}
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
                avatar={<Avatar src={m.senderAvatarUrl} size="avatar_md" />}
                editing={editMessageId === m.eventId}
                onEditMessage={onEditMessage}
                onSelectMessage={props.onSelectMessage}
              >
                {editMessageId === m.eventId ? (
                  <Stack gap>
                    <RichTextEditor
                      editing
                      initialValue={m.body}
                      onSend={onSaveEditedMessage}
                    />
                    <Stack horizontal gap>
                      <Button tone="neutral" onClick={onCancelEdit}>
                        Cancel
                      </Button>
                      {/* <Button onClick={onCancelEdit}>Save</Button> */}
                    </Stack>
                  </Stack>
                ) : (
                  <RichTextPreview content={getMessageContent(m)} />
                )}
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
                      cursor="pointer"
                      onClick={() => props.onSelectMessage?.(m.eventId)}
                    >
                      <Avatar size="avatar_sm" />
                      {repliedMessages[m.eventId]}
                      {repliedMessages[m.eventId] > 1 ? " Replies" : " Reply"}
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

function getMessageContent(message: RoomMessage) {
  switch (message.msgType) {
    case MessageType.WenMoon:
      return `${message.body}\n*${message.eventId}*`;
    case MessageType.Text:
      return message.body;
    default:
      return `${message.body}\n*Unsupported message type* **${message.msgType}**`;
  }
}
