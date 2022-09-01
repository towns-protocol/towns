import { Allotment } from "allotment";
import React, { useCallback, useEffect } from "react";
import {
  Membership,
  MessageType,
  useMyMembership,
  useSpaceData,
  useSpaceTimeline,
  useZionClient,
} from "use-zion-client";
import { MessageTimelineScroller } from "@components/MessageTimeline";
import { RichTextEditor } from "@components/RichText/RichTextEditor";
import { Box, Button, Stack } from "@ui";
import { usePersistPanes } from "hooks/usePersistPanes";

export const SpaceHome = () => {
  const { onSizesChange } = usePersistPanes(["channel", "right"]);
  const { sendMessage, joinRoom } = useZionClient();
  const space = useSpaceData();
  const myMembership = useMyMembership(space?.id);
  const spaceMessages = useSpaceTimeline();

  const onSend = useCallback(
    (value: string) => {
      if (value && space?.id) {
        sendMessage(space?.id, value);
      }
    },
    [space?.id, sendMessage],
  );

  const onJoinSpace = useCallback(() => {
    if (space?.id) {
      joinRoom(space.id);
    }
  }, [joinRoom, space?.id]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (space?.id && myMembership === Membership.Join) {
        sendMessage(space?.id, "🌚 ¿wen moon? 🌝", {
          messageType: MessageType.WenMoon,
        });
      }
    }, 7000);
    return () => clearInterval(interval);
  }, [sendMessage, space?.id, myMembership]);

  if (!space) {
    return null;
  }

  return (
    <Stack horizontal minHeight="100%">
      <Allotment onChange={onSizesChange}>
        <Allotment.Pane>
          {myMembership !== Membership.Join ? (
            <Button onClick={onJoinSpace}>Join {space.name}</Button>
          ) : (
            <Box grow absoluteFill height="100%" overflow="hidden">
              <MessageTimelineScroller
                key={space.id.slug}
                spaceId={space.id}
                channelId={space.id}
                events={spaceMessages}
              />
              <Box paddingBottom="lg" paddingX="lg">
                <RichTextEditor
                  autoFocus
                  initialValue=""
                  placeholder={`Send a message to #${space.name}`}
                  onSend={onSend}
                />
              </Box>
            </Box>
          )}
        </Allotment.Pane>
      </Allotment>
    </Stack>
  );
};
