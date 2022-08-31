import React, { useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import { useChannelData } from "use-zion-client";
import { MessageThread } from "@components/MessageThread";
import { Box } from "@ui";

export const SpacesChannelReplies = (props: { children?: React.ReactNode }) => {
  const { messageId } = useParams();
  const { spaceId, channelId } = useChannelData();
  const navigate = useNavigate();

  const handleClose = useCallback(() => {
    navigate(`/spaces/${spaceId.slug}/channels/${channelId.slug}`);
  }, [channelId.slug, navigate, spaceId.slug]);

  const isValid = !!messageId;

  return (
    <Box grow absoluteFill height="100%" overflow="hidden">
      {isValid ? (
        <>
          <Box grow padding="lg">
            <MessageThread
              key={messageId}
              messageId={messageId}
              onClose={handleClose}
            />
          </Box>
          <Box paddingBottom="lg" paddingX="lg" />
        </>
      ) : (
        <>Invalid Thread</>
      )}
    </Box>
  );
};
