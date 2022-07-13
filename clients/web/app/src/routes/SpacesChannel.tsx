import { Allotment } from "allotment";
import React, { useCallback } from "react";
import { useOutlet, useParams } from "react-router-dom";
import {
  useChannel,
  useMatrixClient,
  useMessages,
  useSpaceId,
} from "use-matrix-client";
import { useNavigate } from "react-router";
import { MessageList } from "@components/MessageScroller";
import { RichTextEditor } from "@components/RichText/RichTextEditor";
import { Box, Icon, Stack } from "@ui";
import { usePersistPanes } from "hooks/usePersistPanes";

export const SpacesChannel = () => {
  const { spaceSlug, channelSlug } = useParams();
  const { sizes, onSizesChange } = usePersistPanes(["channel", "right"]);
  const outlet = useOutlet();
  const { sendMessage } = useMatrixClient();
  const navigate = useNavigate();

  const spaceId = useSpaceId(spaceSlug);
  const channel = useChannel(spaceSlug, channelSlug);
  const channelMessages = useMessages(channelSlug);

  const onSend = useCallback(
    (value: string) => {
      if (value && channel?.id) {
        sendMessage(channel?.id, value);
      }
    },
    [channel?.id, sendMessage],
  );

  const onSettingClick = useCallback(() => {
    navigate(`/spaces/${spaceId?.slug}/channels/${channel?.id.slug}/settings`);
  }, [channel?.id.slug, navigate, spaceId?.slug]);

  return (
    <>
      <Box
        color={{ hover: "default", default: "gray2" }}
        onClick={onSettingClick}
      >
        <Icon type="settings" size="square_sm" />
      </Box>
      <Stack horizontal minHeight="100%">
        <Allotment onChange={onSizesChange}>
          <Allotment.Pane>
            <Box grow absoluteFill height="100%" overflow="hidden">
              <MessageList key={channelSlug} messages={channelMessages} />
              <Box paddingBottom="lg" paddingX="lg">
                <RichTextEditor
                  autoFocus
                  initialValue=""
                  placeholder={`Send a message 3 to #${channel?.label}`}
                  onSend={onSend}
                />
              </Box>
            </Box>
          </Allotment.Pane>
          {outlet && (
            <Allotment.Pane
              minSize={300}
              maxSize={640}
              preferredSize={sizes[1] || 320}
            >
              {outlet}
            </Allotment.Pane>
          )}
        </Allotment>
      </Stack>
    </>
  );
};
