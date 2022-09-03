import { EmojiData } from "emoji-mart";
import React, { useCallback, useContext } from "react";
import { RoomIdentifier, useZionClient } from "use-zion-client";
import { EmojiPickerButton } from "@components/EmojiPickerButton";
import { TimelineMessageContext } from "@components/MessageTimeline";
import { IconButton, Stack } from "@ui";
import { vars } from "ui/styles/vars.css";
import { useOpenMessageThread } from "hooks/useOpenThread";

type Props = {
  eventId: string;
  channelId?: RoomIdentifier;
  spaceId?: RoomIdentifier;
  canEdit?: boolean;
  canReply?: boolean;
  canReact?: boolean;
};

const style = {
  transform: `
    translateY(calc(-50% - ${vars.space.md}))
  `,
};

export const MessageContextMenu = (props: Props) => {
  const { eventId, channelId, spaceId } = props;

  const { sendReaction } = useZionClient();
  const timelineContext = useContext(TimelineMessageContext);

  const { onOpenMessageThread } = useOpenMessageThread(spaceId, channelId);

  const onThreadClick = useCallback(() => {
    onOpenMessageThread(eventId);
  }, [eventId, onOpenMessageThread]);

  const onEditClick = useCallback(() => {
    console.log("edit", eventId);
    timelineContext?.onSelectEditingMessage(eventId);
  }, [eventId, timelineContext]);

  const onSelectEmoji = useCallback((data: EmojiData) => {
    if (!channelId) {
      console.error("no channel id");
      return;
    }
    if (!data.id) {
      console.error("no emoji id");
      return;
    }
    sendReaction(channelId, eventId, data.id);
  }, []);

  return (
    <Stack
      border
      horizontal
      background="level1"
      color="gray2"
      gap="xs"
      padding="xs"
      pointerEvents="auto"
      position="topRight"
      rounded="sm"
      style={style}
      width="auto"
    >
      {props.canEdit && (
        <IconButton icon="edit" size="square_sm" onClick={onEditClick} />
      )}
      {props.canReply && (
        <IconButton icon="threads" size="square_sm" onClick={onThreadClick} />
      )}
      {props.canReact && <EmojiPickerButton onSelectEmoji={onSelectEmoji} />}
    </Stack>
  );
};
