import { Allotment } from "allotment";
import React, { useCallback, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Membership,
  MessageType,
  useMatrixClient,
  useMessages,
  useMyMembership,
  useSpace,
} from "use-matrix-client";
import { MessageList } from "@components/MessageScroller";
import { RichTextEditor } from "@components/RichText/RichTextEditor";
import { Box, Button, Stack } from "@ui";
import { usePersistPanes } from "hooks/usePersistPanes";

export const SpaceHome = () => {
  const { spaceSlug } = useParams();
  const { onSizesChange } = usePersistPanes(["channel", "right"]);
  const { sendMessage, joinRoom } = useMatrixClient();
  const space = useSpace(spaceSlug);
  const myMembership = useMyMembership(space?.id);
  const spaceMessages = useMessages(space?.id.slug);

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
              <MessageList key={space.id.slug} messages={spaceMessages} />
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
