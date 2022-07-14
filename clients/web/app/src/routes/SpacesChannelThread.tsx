import React, { useCallback } from "react";
import { useNavigate, useParams } from "react-router";
import { MessageThread } from "@components/MessageThread";
import { Box } from "@ui";

export const SpacesChannelReplies = (props: { children?: React.ReactNode }) => {
  const { spaceSlug, channelSlug, messageId } = useParams();

  const navigate = useNavigate();

  const handleClose = useCallback(() => {
    navigate(`/spaces/${spaceSlug}/channels/${channelSlug}`);
  }, [channelSlug, navigate, spaceSlug]);

  const isValid = spaceSlug && channelSlug && messageId;

  return (
    <Box grow absoluteFill height="100%" overflow="hidden">
      {isValid ? (
        <>
          <Box grow padding="lg">
            <MessageThread
              key={messageId}
              spaceSlug={spaceSlug}
              channelSlug={channelSlug}
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
