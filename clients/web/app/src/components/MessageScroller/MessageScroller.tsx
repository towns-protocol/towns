import { RelationType } from "matrix-js-sdk";
import React, { useRef, useState } from "react";
// import { useInView } from "react-intersection-observer";
import useEvent from "react-use-event-hook";
import {
  MessageType,
  RoomIdentifier,
  RoomMessageEvent,
  TimelineEvent,
  ZTEvent,
  useMatrixStore,
} from "use-zion-client";
import { Message } from "@components/Message";
import {
  RichTextEditor,
  RichTextPreview,
} from "@components/RichText/RichTextEditor";
import { FadeIn } from "@components/Transitions";
import { Avatar, Box, Paragraph, Stack } from "@ui";
import { useEditMessage } from "hooks/useEditMessage";
import {
  useFilterReplies,
  useMessageReplyCount,
} from "hooks/useFixMeMessageThread";

const INITIAL_MESSAGE_COUNT = 15;

interface Props {
  channelId: RoomIdentifier;
  messages: TimelineEvent[];
  onSelectMessage?: (id: string) => void;
  hideThreads?: boolean;
  before?: JSX.Element;
  after?: JSX.Element;
}

export const MessageScroller = (props: Props) => {
  const { channelId, messages } = props;

  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  /* FIXME: cancels lazy reveal of messages */
  // const { ref, displayCount } = useLoadMore(
  //   containerRef,
  //   contentRef,
  //   messages.length,
  // );

  const { userId } = useMatrixStore();

  // strip-out replies on main timeline (hack!)
  const { filteredMessages } = useFilterReplies(messages, props.hideThreads);
  // create a slice of messages to display
  /* FIXME: cancels lazy reveal of messages */
  const paginatedMessages = filteredMessages.slice(); //editedMessages.slice(-displayCount);

  /* FIXME: cancels lazy reveal of messages */
  // const { endRef } = useMessageScroll(
  //   containerRef,
  //   paginatedMessages[paginatedMessages.length - 1]?.eventId,
  // );

  const repliedMessages = useMessageReplyCount(messages);

  const [editMessageId, setEditMessageId] = useState<string>();

  const onEditMessage = useEvent((messageId: string) => {
    setEditMessageId(() =>
      editMessageId === messageId ? undefined : messageId,
    );
  });

  const { sendEditedMessage } = useEditMessage(channelId);

  const onSaveEditedMessage = (value: string) => {
    if (editMessageId) {
      sendEditedMessage(value, editMessageId);
      setEditMessageId(undefined);
    }
  };

  const onCancelEdit = useEvent(() => {
    setEditMessageId(undefined);
  });

  return (
    <Stack grow ref={containerRef} overflow="auto">
      <Stack grow style={{ minHeight: "min-content" }}>
        <Stack grow paddingY="md" justifyContent="end" ref={contentRef}>
          {/* FIXME: cancels lazy reveal of messages */}
          {/* <div ref={ref} /> */}
          {props.before}
          {paginatedMessages.map((m, index) => (
            <FadeIn
              fast
              key={m.eventId}
              disabled={
                index > paginatedMessages.length - INITIAL_MESSAGE_COUNT
              }
            >
              {getEventComponent(
                userId,
                editMessageId,
                onEditMessage,
                onSaveEditedMessage,
                onCancelEdit,
                props,
                m,
                repliedMessages,
              )}
            </FadeIn>
          ))}
          {props.after}
        </Stack>

        {/* FIXME: cancels lazy reveal of messages */}
        {/* <div ref={endRef} /> */}
      </Stack>
    </Stack>
  );
};

/* FIXME: cancels lazy reveal of messages 
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
*/

/* FIXME: cancels lazy reveal of messages 
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
*/

function getEventComponent(
  userId: string | null,
  editMessageId: string | undefined,
  onEditMessage: (messageId: string) => void,
  onSaveEditedMessage: (value: string) => void,
  onCancelEdit: () => void,
  props: Props,
  event: TimelineEvent,
  repliedMessages: Record<string, number>,
) {
  const content = event.content;
  switch (content?.kind) {
    case ZTEvent.RoomMessage:
      return getRoomMessageContent(
        userId,
        editMessageId,
        onEditMessage,
        onSaveEditedMessage,
        onCancelEdit,
        props,
        event,
        content,
        repliedMessages,
      );
    case ZTEvent.RoomMember:
      return getGenericComponent(event, event.fallbackContent);
    case ZTEvent.RoomCreate:
      return getGenericComponent(event, event.fallbackContent);
    default:
      return getGenericComponent(event, event.fallbackContent);
  }
}

function getGenericComponent(event: TimelineEvent, content: string) {
  return (
    <Message
      id={event.eventId}
      name={event.eventType}
      paddingX="lg"
      paddingY="md"
      editable={false}
      avatar={<Avatar src={undefined} size="avatar_md" />}
      editing={false}
    >
      <RichTextPreview content={content} edited={false} />
    </Message>
  );
}

function getRoomMessageContent(
  userId: string | null,
  editMessageId: string | undefined,
  onEditMessage: (messageId: string) => void,
  onSaveEditedMessage: (value: string) => void,
  onCancelEdit: () => void,
  props: Props,
  event: TimelineEvent,
  m: RoomMessageEvent,
  repliedMessages: Record<string, number>,
) {
  return (
    <Message
      id={event.eventId}
      name={m.sender.displayName}
      paddingX="lg"
      paddingY="md"
      editable={m.sender.id === userId && !event.isLocalPending}
      avatar={<Avatar src={m.sender.avatarUrl} size="avatar_md" />}
      editing={editMessageId === event.eventId}
      onEditMessage={onEditMessage}
      onSelectMessage={props.onSelectMessage}
    >
      {editMessageId === event.eventId ? (
        <Stack gap>
          <RichTextEditor
            editing
            displayButtons
            initialValue={m.body}
            onSend={onSaveEditedMessage}
            onCancel={onCancelEdit}
          />
        </Stack>
      ) : (
        <RichTextPreview
          content={getMessageBody(event.eventId, m)}
          edited={m.content["m.relates_to"]?.rel_type === RelationType.Replace}
        />
      )}
      {repliedMessages[event.eventId] && (
        <Box horizontal paddingY="md">
          <Box
            shrink
            centerContent
            horizontal
            gap="sm"
            cursor="pointer"
            onClick={() => props.onSelectMessage?.(event.eventId)}
          >
            <Paragraph strong size="sm" color="accent">
              {repliedMessages[event.eventId]}
              {repliedMessages[event.eventId] > 1 ? " replies" : " reply"}
            </Paragraph>
          </Box>
        </Box>
      )}
    </Message>
  );
}

function getMessageBody(eventId: string, message: RoomMessageEvent): string {
  switch (message.msgType) {
    case MessageType.WenMoon:
      return `${message.body} 
      ${eventId}
      `;
    case MessageType.Text:
      return message.body;
    default:
      return `${message.body}\n*Unsupported message type* **${message.msgType}**`;
  }
}
