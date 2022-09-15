import { Allotment } from "allotment";
import React, { useCallback } from "react";
import { useOutlet, useParams } from "react-router";
import {
  ChannelContextProvider,
  Membership,
  useChannelData,
  useChannelTimeline,
  useMyMembership,
  useZionClient,
  useZionContext,
} from "use-zion-client";
import { ChannelHeader } from "@components/ChannelHeader";
import { RichTextEditor } from "@components/RichText/RichTextEditor";
import { MessageTimelineScroller } from "@components/MessageTimeline";
import { Box, Button, Stack } from "@ui";
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
  const { unreadCounts } = useZionContext();
  const { joinRoom, sendMessage, sendReadReceipt } = useZionClient();

  const { spaceId, channelId, channel } = useChannelData();

  const myMembership = useMyMembership(channelId);
  const channelMessages = useChannelTimeline();
  const hasUnread =
    channelMessages.length > 0 &&
    (unreadCounts[channelId.matrixRoomId] ?? 0) > 0;

  const onSend = useCallback(
    (value: string) => {
      if (value && channelId) {
        sendMessage(channelId, value);
      }
    },
    [channelId, sendMessage],
  );

  const onJoinChannel = useCallback(() => {
    joinRoom(channelId);
  }, [joinRoom, channelId]);

  const onMarkAsRead = useCallback(() => {
    void sendReadReceipt(
      channelId,
      channelMessages[channelMessages.length - 1].eventId,
    );
  }, [channelId, channelMessages, sendReadReceipt]);

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
              <MessageTimelineScroller
                hideThreads
                key={channelId.slug}
                spaceId={spaceId}
                channelId={channelId}
                events={channelMessages}
                before={<ChannelHeader name={channel.label} />}
              />
              {hasUnread && (
                <Button
                  key={channelId.slug + "mark-as-read"}
                  size="button_lg"
                  onClick={onMarkAsRead}
                >
                  Click here to Mark as Read (temp)
                </Button>
              )}

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
