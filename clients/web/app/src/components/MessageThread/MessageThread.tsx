import React from "react";
import { RoomMessageEvent, TimelineEvent, ZTEvent } from "use-zion-client";
import { Message } from "@components/Message";
import {
  RichTextEditor,
  RichTextPreview,
} from "@components/RichText/RichTextEditor";
import { Avatar, Box, Divider, IconButton, Stack } from "@ui";
import { useMessageThread } from "hooks/useFixMeMessageThread";
import { useSendReply } from "hooks/useSendReply";

type Props = {
  messageId: string;
  onClose?: () => void;
};
export const MessageThread = (props: Props) => {
  const { messageId } = props;
  const { parentMessage, messages } = useMessageThread(messageId);
  const { sendReply } = useSendReply(messageId);

  const onSend = (value: string) => {
    sendReply(value);
  };
  return (
    <MessageWindow onClose={props.onClose}>
      <Box height="100%">
        <Stack
          gap
          overflowY="scroll"
          paddingTop="md"
          style={{
            flex: "1 1 auto",
            overflowY: "auto",
            minHeight: "0px",
          }}
        >
          {parentMessage && getEventComponent(parentMessage)}
          {!!messages.length && (
            <Box paddingX="lg">
              <Divider space="none" />
            </Box>
          )}
          {!!messages.length && messages.map((m) => getEventComponent(m))}
          <Box
            paddingX="lg"
            paddingY="none"
            style={{ position: "sticky", bottom: 0 }}
          >
            <RichTextEditor onSend={onSend} />
          </Box>
        </Stack>
      </Box>
    </MessageWindow>
  );
};

const MessageWindow = (props: {
  children: React.ReactNode;
  onClose?: () => void;
}) => {
  return (
    <Box absoluteFill position="relative" padding="lg">
      <Box
        border
        rounded="md"
        overflow="hidden"
        maxHeight="100%"
        paddingBottom="lg"
      >
        <Stack
          padding
          horizontal
          background="level2"
          minHeight="x7"
          alignItems="center"
          color="gray1"
        >
          <Box grow />
          <Box>
            {props.onClose && (
              <IconButton icon="close" onClick={props.onClose} />
            )}
          </Box>
        </Stack>
        <Box overflow="scroll">{props.children}</Box>
      </Box>
    </Box>
  );
};

function getEventComponent(event: TimelineEvent) {
  const content = event.content;
  switch (content?.kind) {
    case ZTEvent.RoomMessage:
      return getRoomMessageContent(content);
    default:
      return getGenericComponent(event, event.fallbackContent);
  }
}

function getGenericComponent(event: TimelineEvent, content: string) {
  return (
    <Message
      paddingX="lg"
      paddingY="sm"
      name={event.eventType}
      avatar={<Avatar src={undefined} />}
    >
      <RichTextPreview content={event.fallbackContent} />
    </Message>
  );
}

function getRoomMessageContent(m: RoomMessageEvent) {
  return (
    <Message
      paddingX="lg"
      paddingY="sm"
      name={m.sender.displayName}
      avatar={<Avatar src={m.sender.avatarUrl} />}
    >
      <RichTextPreview content={m.body} />
    </Message>
  );
}
