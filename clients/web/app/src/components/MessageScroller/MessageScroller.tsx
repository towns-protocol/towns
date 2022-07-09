import React, { useLayoutEffect, useRef } from "react";
import { RoomMessage } from "use-matrix-client";
import { Message } from "@components/Message";
import { RichTextPreview } from "@components/RichText/RichTextEditor";
import { Avatar, Stack } from "@ui";

export const MessageScroller = (props: { messages: RoomMessage[] }) => {
  const { messages } = props;
  const { containerRef, endRef } = useMessageScroll(
    messages[messages.length - 1]?.eventId,
    messages.find((m) => m.sender === "???" || true)?.eventId,
  );
  return (
    <Stack grow ref={containerRef} position="relative">
      <Stack absoluteFill>
        <Stack overflowY="scroll" height="100%">
          <Stack grow paddingY="md" justifyContent="end">
            {props.messages.map((m, index) => (
              <Message
                key={m.eventId}
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
            ))}
          </Stack>
          <div ref={endRef} />
        </Stack>
      </Stack>
    </Stack>
  );
};

const useMessageScroll = (
  lastMessageId?: string,
  lastMessageByMeId?: string,
) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    endRef.current?.scrollIntoView();
  }, [lastMessageId]);

  return { endRef, containerRef };
};
