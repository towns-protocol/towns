import { Allotment } from "allotment";
import React, { useCallback } from "react";
import { useNavigate, useOutlet, useParams } from "react-router";
import {
  ChannelContextProvider,
  Membership,
  useChannelData,
  useChannelTimeline,
  useMyMembership,
  useZionClient,
} from "use-zion-client";
import { ChannelHeader } from "@components/ChannelHeader";
import { MessageList } from "@components/MessageScroller";
import { RichTextEditor } from "@components/RichText/RichTextEditor";
import { Box, Button, Divider, Paragraph, Stack } from "@ui";
import { usePersistPanes } from "hooks/usePersistPanes";

export const SpacesChannel = () => {
  const { channelSlug } = useParams();
  if (!channelSlug) {
    return <>SpacesChannel Route expects a channelSlug</>;
  }
  return (
    <ChannelContextProvider channelId={channelSlug}>
      <SpacesChannelComponent />
    </ChannelContextProvider>
  );
};

const SpacesChannelComponent = () => {
  const { messageId } = useParams();
  const { sizes, onSizesChange } = usePersistPanes(["channel", "right"]);
  const outlet = useOutlet();
  const { joinRoom, sendMessage, scrollback } = useZionClient();
  const navigate = useNavigate();

  const { spaceId, channelId, channel } = useChannelData();
  const myMembership = useMyMembership(channelId);
  const channelMessages = useChannelTimeline();

  const onSend = useCallback(
    (value: string) => {
      if (value && channelId) {
        sendMessage(channelId, value);
      }
    },
    [channelId, sendMessage],
  );

  const onLoadMore = useCallback(() => {
    scrollback(channelId);
  }, [channelId, scrollback]);

  const onJoinChannel = useCallback(() => {
    joinRoom(channelId);
  }, [joinRoom, channelId]);

  const onSelectMessage = (eventId: string) => {
    navigate(
      `/spaces/${spaceId.slug}/channels/${channelId.slug}/replies/${eventId}`,
    );
  };

  const hasThreadOpen = !!messageId;

  if (!channel) {
    return (
      <div>
        404 Channel {spaceId.matrixRoomId} / {channelId.matrixRoomId} not found
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
                key={channelId.slug}
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
                key={channelId.slug}
                channelId={channelId}
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
