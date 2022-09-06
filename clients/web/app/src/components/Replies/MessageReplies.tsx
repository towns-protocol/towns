import React, { useCallback } from "react";
import { useChannelId, useSpaceId } from "use-zion-client";
import { useOpenMessageThread } from "hooks/useOpenThread";
import { Box, Paragraph } from "@ui";

export const MessageReplies = (props: {
  replyCount: number;
  eventId: string;
}) => {
  const { replyCount, eventId } = props;

  const spaceId = useSpaceId();
  const channelId = useChannelId();

  const { onOpenMessageThread } = useOpenMessageThread(spaceId, channelId);

  const onClick = useCallback(
    () => onOpenMessageThread(eventId),
    [onOpenMessageThread, eventId],
  );

  return (
    <Box horizontal>
      <Box
        shrink
        centerContent
        horizontal
        gap="sm"
        cursor="pointer"
        onClick={onClick}
      >
        <Paragraph strong size="sm" color="etherum">
          {replyCount}
          {replyCount > 1 ? " replies" : " reply"}
        </Paragraph>
      </Box>
    </Box>
  );
};
