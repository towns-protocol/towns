import { formatDistance } from "date-fns";
import { RelationType } from "matrix-js-sdk";
import React from "react";

import {
  MessageType,
  RoomIdentifier,
  RoomMessageEvent,
  TimelineEvent,
  ZTEvent,
} from "use-zion-client";
import { Message } from "@components/Message";
import { MessageReplies } from "@components/Replies/MessageReplies";
import { RichTextPreview } from "@components/RichText/RichTextEditor";
import { TimelineMessageEditor } from "./TimelineMessageEditor";

type Props = {
  channelId: RoomIdentifier;
  editing?: boolean;
  event: TimelineEvent;
  minimal?: boolean;
  own?: boolean;
  replyCount?: number;
  spaceId: RoomIdentifier;
};

export function isRoomMessageContent(event: TimelineEvent) {
  return event?.eventType === ZTEvent.RoomMessage
    ? (event.content as RoomMessageEvent)
    : undefined;
}

export const TimelineMessage = (props: Props) => {
  const {
    channelId,
    editing: isEditing,
    event,
    minimal: isMinimal,
    own: isOwn,
    replyCount,
    spaceId,
  } = props;

  const m = isRoomMessageContent(event);

  const date = formatDistance(Date.now(), event.originServerTs);

  return !m ? null : (
    <Message
      date={date}
      avatar={m.sender.avatarUrl}
      channelId={channelId}
      editable={isOwn && !event.isLocalPending}
      eventId={event.eventId}
      minimal={isMinimal}
      name={`${m.sender.displayName}`}
      paddingBottom={isMinimal ? "sm" : "sm"}
      paddingTop={isMinimal ? "sm" : "lg"}
      paddingX="lg"
      spaceId={spaceId}
    >
      {isEditing ? (
        <TimelineMessageEditor
          initialValue={m.body}
          eventId={event.eventId}
          channelId={channelId}
        />
      ) : (
        <RichTextPreview
          content={getMessageBody(event.eventId, m)}
          edited={m.content["m.relates_to"]?.rel_type === RelationType.Replace}
        />
      )}
      {replyCount && (
        <MessageReplies replyCount={replyCount} eventId={event.eventId} />
      )}
    </Message>
  );
};

function getMessageBody(eventId: string, message: RoomMessageEvent): string {
  switch (message.msgType) {
    case MessageType.WenMoon:
      return `${message.body} 
      ${eventId}
      `;
    case MessageType.Text:
      return message.body;
    default:
      return `${message.body}\n*Unsupported message type* **${message.msgType}**`;
  }
}
