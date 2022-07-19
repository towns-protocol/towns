import { Allotment } from "allotment";
import React, { useCallback } from "react";
import { useNavigate } from "react-router";
import { useOutlet, useParams } from "react-router-dom";
import {
  Membership,
  useChannel,
  useMatrixClient,
  useMessages,
  useMyMembership,
  useSpaceId,
} from "use-matrix-client";
import { usePersistPanes } from "hooks/usePersistPanes";
import { Box, Button, Icon, Stack } from "@ui";
import { RichTextEditor } from "@components/RichText/RichTextEditor";
import { MessageList } from "@components/MessageScroller";

export const SpacesChannel = () => {
  const { spaceSlug, channelSlug, messageId } = useParams();
  const { sizes, onSizesChange } = usePersistPanes(["channel", "right"]);
  const outlet = useOutlet();
  const { joinRoom, sendMessage } = useMatrixClient();
  const navigate = useNavigate();

  const spaceId = useSpaceId(spaceSlug);
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

  const onJoinChannel = useCallback(() => {
    if (channel?.id) {
      joinRoom(channel.id);
    }
  }, [joinRoom, channel?.id]);

  const onSettingClick = useCallback(() => {
    navigate(`/spaces/${spaceId?.slug}/channels/${channel?.id.slug}/settings`);
  }, [channel?.id.slug, navigate, spaceId?.slug]);

  const onSelectMessage = (eventId: string) => {
    navigate(`/spaces/${spaceSlug}/channels/${channelSlug}/replies/${eventId}`);
  };

  const hasThreadOpen = !!messageId;

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
            <Button onClick={onJoinChannel}>Join {channel.label}</Button>
          ) : (
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
