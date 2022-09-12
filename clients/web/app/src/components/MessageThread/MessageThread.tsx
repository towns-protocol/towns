import React from "react";
import useEvent from "react-use-event-hook";
import { useMatrixStore, useZionClient } from "use-zion-client";
import { useChannelContext } from "use-zion-client/dist/components/ChannelContextProvider";
import { TimelineMessage } from "@components/MessageTimeline/events/TimelineMessage";
import { MessageTimeline } from "@components/MessageTimeline/MessageTimeline";
import { RichTextEditor } from "@components/RichText/RichTextEditor";
import { Box, Divider, IconButton, Stack } from "@ui";
import { useMessageThread } from "hooks/useFixMeMessageThread";
import { useSendReply } from "hooks/useSendReply";
import { getIsRoomMessageContent } from "utils/ztevent_util";

type Props = {
  messageId: string;
  onClose?: () => void;
};
export const MessageThread = (props: Props) => {
  const { userId } = useMatrixStore();
  const { channelId, spaceId } = useChannelContext();
  const { messageId } = props;
  const { parentMessage, messages } = useMessageThread(messageId);
  const { sendReply } = useSendReply(messageId);

  const onSend = (value: string) => {
    sendReply(value);
  };
  const { sendReaction } = useZionClient();
  const onReaction = useEvent((eventId: string, reaction: string) => {
    sendReaction(channelId, eventId, reaction);
  });

  const parentMessageContent = getIsRoomMessageContent(parentMessage);

  return (
    <Stack absoluteFill padding gap position="relative">
      <MessageWindow onClose={props.onClose}>
        <Stack scroll grow>
          {parentMessage && parentMessageContent && (
            <TimelineMessage
              userId={userId}
              channelId={channelId}
              event={parentMessage}
              eventContent={parentMessageContent}
              spaceId={spaceId}
              onReaction={onReaction}
            />
          )}
          {!!messages.length && (
            <Box paddingX="md" paddingTop="md">
              <Divider space="none" />
            </Box>
          )}
          <Stack>
            <MessageTimeline
              events={messages}
              spaceId={spaceId}
              channelId={channelId}
            />
          </Stack>
        </Stack>
      </MessageWindow>
      <Box paddingY="none" style={{ position: "sticky", bottom: 0 }}>
        <RichTextEditor placeholder="Reply..." onSend={onSend} />
      </Box>
    </Stack>
  );
};

const MessageWindow = (props: {
  children: React.ReactNode;
  onClose?: () => void;
}) => {
  return (
    <Box
      border
      rounded="sm"
      overflow="hidden"
      maxHeight="100%"
      paddingBottom="md"
    >
      <Stack
        horizontal
        padding="sm"
        background="level2"
        minHeight="x5"
        alignItems="center"
        color="gray1"
      >
        <Box grow />
        <Box>
          {props.onClose && <IconButton icon="close" onClick={props.onClose} />}
        </Box>
      </Stack>
      <Box scroll>{props.children}</Box>
    </Box>
  );
};
