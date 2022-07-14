import React from "react";
import { Message } from "@components/Message";
import {
  RichTextEditor,
  RichTextPreview,
} from "@components/RichText/RichTextEditor";
import { Avatar, Box, Divider, IconButton, Stack } from "@ui";
import { useMessageThread, useSendReply } from "hooks/useMessageThread";

type Props = {
  spaceSlug: string;
  channelSlug: string;
  messageId: string;
  onClose?: () => void;
};
export const MessageThread = (props: Props) => {
  const { spaceSlug, channelSlug, messageId } = props;
  const { parentMessage, messages } = useMessageThread(channelSlug, messageId);

  const { sendReply } = useSendReply(spaceSlug, channelSlug, messageId);

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
          {parentMessage && (
            <Message
              paddingX="lg"
              paddingY="sm"
              name="m00nfLee"
              date="Today, 11:03pm"
              avatar={<Avatar />}
            >
              <RichTextPreview content={parentMessage.body} />
            </Message>
          )}
          {!!messages.length && (
            <Box paddingX="lg">
              <Divider space="none" />
            </Box>
          )}
          {!!messages.length &&
            messages.map((m) => (
              <Message
                paddingX="lg"
                paddingY="sm"
                name="m00nfLee"
                date="Today, 11:03pm"
                avatar={<Avatar src="/placeholders/nft_3.png" />}
              >
                <RichTextPreview content={m.body} />
              </Message>
            ))}
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
