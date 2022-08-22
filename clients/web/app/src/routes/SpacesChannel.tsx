import { Allotment } from "allotment";
import React, { useCallback, useMemo } from "react";
import { useNavigate, useOutlet, useParams } from "react-router";
import {
  Membership,
  useChannel,
  useMessages,
  useMyMembership,
  useZionClient,
} from "use-zion-client";
import { ChannelHeader } from "@components/ChannelHeader";
import { MessageList } from "@components/MessageScroller";
import { RichTextEditor } from "@components/RichText/RichTextEditor";
import { Box, Button, Divider, Paragraph, Stack } from "@ui";
import { usePersistPanes } from "hooks/usePersistPanes";

export const SpacesChannel = () => {
  const { spaceSlug, channelSlug, messageId } = useParams();
  const { sizes, onSizesChange } = usePersistPanes(["channel", "right"]);
  const outlet = useOutlet();
  const { joinRoom, sendMessage, scrollback } = useZionClient();
  const navigate = useNavigate();

  const channel = useChannel(spaceSlug, channelSlug);
  const myMembership = useMyMembership(channel?.id);
  const channelMessages = useMessages(channelSlug);

  const onSend = useCallback(
    (value: string) => {
      if (value && channel?.id) {
        sendMessage(channel?.id, value);
      }
    },
    [channel?.id, sendMessage],
  );

  const onLoadMore = useCallback(() => {
    if (channel?.id) {
      scrollback(channel.id);
    }
  }, [channel?.id, scrollback]);

  const onJoinChannel = useCallback(() => {
    if (channel?.id) {
      joinRoom(channel.id);
    }
  }, [joinRoom, channel?.id]);

  const onSelectMessage = (eventId: string) => {
    navigate(`/spaces/${spaceSlug}/channels/${channelSlug}/replies/${eventId}`);
  };

  const hasThreadOpen = !!messageId;

  const messageContext = useMemo(() => {
    if (spaceSlug && channelSlug) {
      return { spaceSlug, channelSlug };
    }
  }, [channelSlug, spaceSlug]);

  if (!channel) {
    return (
      <div>
        404 Channel {spaceSlug} / {channelSlug} not found
      </div>
    );
  }

  return (
    <Stack horizontal minHeight="100%">
      <Allotment onChange={onSizesChange}>
        <Allotment.Pane minSize={550}>
          {myMembership !== Membership.Join ? (
            <Box absoluteFill centerContent>
              <Button
                key={channelSlug}
                size="button_lg"
                onClick={onJoinChannel}
              >
                Join #{channel.label}
              </Button>
            </Box>
          ) : (
            <Box grow absoluteFill height="100%">
              <MessageList
                hideThreads
                key={channelSlug}
                messages={channelMessages}
                before={<ChannelHeader name={channel.label} />}
                after={
                  <Box gap padding="lg" rounded="xs">
                    <Divider label="debug" />
                    <Button animate={false} onClick={onLoadMore}>
                      Load Messages
                    </Button>

                    <Paragraph size="sm" color="gray2">
                      length: {channelMessages.length}
                    </Paragraph>
                    <Divider />
                  </Box>
                }
                messageContext={messageContext}
                onSelectMessage={onSelectMessage}
              />

              <Box gap paddingBottom="lg" paddingX="lg">
                <RichTextEditor
                  autoFocus={!hasThreadOpen}
                  initialValue=""
                  placeholder={`Send a message to #${channel?.label}`}
                  onSend={onSend}
                />
              </Box>
            </Box>
          )}
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
