import React, { useCallback, useContext } from "react";
import { RoomIdentifier } from "use-zion-client";
import { RichTextEditor } from "@components/RichText/RichTextEditor";
import { Stack } from "@ui";
import { useRedactChannelEvent } from "hooks/useEditMessage";
import { TimelineMessageContext } from "../MessageTimeline";

export const TimelineMessageEditor = (props: {
  eventId: string;
  channelId: RoomIdentifier;
  initialValue: string;
}) => {
  const { initialValue, channelId, eventId } = props;
  const { onCancelEditingMessage } = useContext(TimelineMessageContext) ?? {};
  const { redactChannelEvent } = useRedactChannelEvent(channelId);

  const onSend = useCallback(
    (value: string) => {
      redactChannelEvent({
        parentId: eventId,
        value,
      });
      onCancelEditingMessage?.();
    },
    [onCancelEditingMessage, eventId, redactChannelEvent],
  );

  const onCancel = useCallback(() => {
    onCancelEditingMessage?.();
  }, [onCancelEditingMessage]);

  return (
    <Stack gap>
      <RichTextEditor
        editable
        editing
        displayButtons
        initialValue={initialValue}
        onSend={onSend}
        onCancel={onCancel}
      />
    </Stack>
  );
};
