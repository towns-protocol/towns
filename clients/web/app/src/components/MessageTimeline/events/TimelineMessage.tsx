import { RelationType } from "matrix-js-sdk";
import React from "react";

import {
  RoomIdentifier,
  RoomMessageEvent,
  TimelineEvent,
} from "use-zion-client";
import { Message } from "@components/Message";
import { RichTextPreview } from "@components/RichText/RichTextEditor";
import { MessageReactions } from "hooks/useFixMeMessageThread";
import { getMessageBody } from "utils/ztevent_util";
import { TimelineMessageEditor } from "./TimelineMessageEditor";

type Props = {
  userId: string | null;
  channelId: RoomIdentifier;
  editing?: boolean;
  event: TimelineEvent;
  eventContent: RoomMessageEvent;
  minimal?: boolean;
  own?: boolean;
  reactions?: MessageReactions;
  replies?: number;
  spaceId: RoomIdentifier;
  onReaction: (eventId: string, reaction: string) => void;
};

export const TimelineMessage = React.memo((props: Props) => {
  const {
    userId,
    channelId,
    editing: isEditing,
    event,
    eventContent,
    minimal: isMinimal,
    own: isOwn,
    reactions,
    replies: replyCount,
    spaceId,
    onReaction,
  } = props;

  return !event ? null : (
    <Message
      userId={userId}
      timestamp={event.originServerTs}
      avatar={eventContent.sender.avatarUrl}
      channelId={channelId}
      editable={isOwn && !event.isLocalPending}
      eventId={event.eventId}
      minimal={isMinimal}
      name={`${eventContent.sender.displayName}`}
      paddingY="sm"
      paddingX="lg"
      spaceId={spaceId}
      reactions={reactions}
      replies={replyCount}
      onReaction={onReaction}
    >
      {isEditing ? (
        <TimelineMessageEditor
          initialValue={eventContent.body}
          eventId={event.eventId}
          channelId={channelId}
        />
      ) : (
        <RichTextPreview
          content={getMessageBody(event.eventId, eventContent)}
          edited={
            eventContent.content["m.relates_to"]?.rel_type ===
            RelationType.Replace
          }
        />
      )}
    </Message>
  );
});
