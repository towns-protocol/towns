import { Allotment } from "allotment";
import React, { useCallback, useEffect } from "react";
import { useParams } from "react-router-dom";
import {
  Membership,
  useMatrixClient,
  useMessages,
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

  const spaceMessages = useMessages(space?.id.slug);

  const onSend = useCallback(
    (value: string) => {
      if (value && space?.id) {
        sendMessage(space?.id, value);
      }
    },
    [space?.id, sendMessage],
  );

  const joinSpace = useCallback(() => {
    if (space?.id) {
      joinRoom(space.id);
    }
  }, [joinRoom, space?.id]);

  useEffect(() => {
    const interval = setInterval(() => {
      if (space?.id && space?.membership === Membership.Join) {
        sendMessage(space?.id, "🌚 ¿wen moon? 🌝", undefined, "m.wenmoon");
      }
    }, 7000);
    return () => clearInterval(interval);
  }, [sendMessage, space?.id, space?.membership]);

  if (!space) {
    return null;
  }

  return (
    <Stack horizontal minHeight="100%">
      <Allotment onChange={onSizesChange}>
        <Allotment.Pane>
          {space.membership === Membership.Join ? (
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
          ) : (
            <Button onClick={joinSpace}>Join {space.name}</Button>
          )}
        </Allotment.Pane>
      </Allotment>
    </Stack>
  );
};
