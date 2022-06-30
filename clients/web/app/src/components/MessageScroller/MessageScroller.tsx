import React, { useEffect, useLayoutEffect, useRef } from "react";
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
    <Stack grow position="relative" overflow="scroll" ref={containerRef}>
      <Stack absoluteFill>
        <Stack gap="lg" paddingY="lg" paddingX="lg">
          {props.messages.map((m, index) => (
            <Message
              key={m.eventId}
              name={m.sender}
              avatar={
                <Avatar circle src="/placeholders/nft_2.png" size="avatar_md" />
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

  useEffect(() => {
    setTimeout(() => {
      endRef.current?.scrollIntoView();
    }, 50);
  }, []);

  return { endRef, containerRef };
};
