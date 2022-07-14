import { Allotment } from "allotment";
import React, { useCallback, useMemo } from "react";
import { useNavigate, useNavigate } from "react-router";
import { useOutlet, useParams } from "react-router-dom";
import {
  useChannel,
  useMatrixClient,
  useMessages,
  useSpaceId,
} from "use-matrix-client";
import { useSpaceData } from "hooks/useSpaceData";
import { Channel } from "data/ChannelData";
import { MessageList } from "@components/MessageScroller";
import { RichTextEditor } from "@components/RichText/RichTextEditor";
import { Box, Icon, Stack } from "@ui";
import { usePersistPanes } from "hooks/usePersistPanes";

export const SpacesChannel = () => {
  const { spaceSlug, channelSlug, messageId } = useParams();
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

  const navigate = useNavigate();
  const onSelectMessage = (eventId: string) => {
    navigate(`/spaces/${spaceSlug}/channels/${channelSlug}/replies/${eventId}`);
  };

  const hasThreadOpen = !!messageId;

  return (
    <Stack horizontal minHeight="100%">
      <Allotment onChange={onSizesChange}>
        <Allotment.Pane minSize={550}>
          <Box grow absoluteFill height="100%">
            <Box
              color={{ hover: "default", default: "gray2" }}
              onClick={onSettingClick}
            >
              <Icon type="settings" size="square_sm" />
            </Box>
            <MessageList
              hideThreads
              key={channelSlug}
              messages={channelMessages}
              before={channel && <ChanelIntro channel={channel} />}
              onSelectMessage={onSelectMessage}
            />
            <Box paddingBottom="lg" paddingX="lg">
              <RichTextEditor
                autoFocus={!hasThreadOpen}
                initialValue=""
                placeholder={`Send a message to #${channel?.label}`}
                onSend={onSend}
              />
            </Box>
          </Box>
        </Allotment.Pane>
        {outlet && (
          <Allotment.Pane minSize={300} preferredSize={sizes[1] || 840}>
            {outlet}
          </Allotment.Pane>
        )}
      </Allotment>
    </Stack>
  );
};

const ChanelIntro = (props: { channel: Channel }) => <Stack>Hello</Stack>;
