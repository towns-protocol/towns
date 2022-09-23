import { RelationType } from "matrix-js-sdk";
import React from "react";

import {
  RoomIdentifier,
  RoomMessageEvent,
  TimelineEvent,
  useSpaceMembers,
} from "use-zion-client";
import { Message } from "@components/Message";
import { RichTextPreview } from "@components/RichText/RichTextEditor";
import { MessageReactions, useHandleReaction } from "hooks/useReactions";
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
  relativeDate?: boolean;
  replies?: number;
  spaceId: RoomIdentifier;
  onReaction: ReturnType<typeof useHandleReaction>;
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
    relativeDate: isRelativeDate,
    replies: replyCount,
    spaceId,
    onReaction,
  } = props;

  const { sender } = eventContent;

  // note: should be memoized
  const { membersMap } = useSpaceMembers();
  const user = membersMap.get(sender.id)?.user;
  const displayName = user?.displayName ?? sender.displayName;
  const avatarUrl = user?.avatarUrl ?? sender.avatarUrl;

  return !event ? null : (
    <Message
      id={`event-${event.eventId}`}
      userId={userId}
      timestamp={event.originServerTs}
      avatar={avatarUrl}
      channelId={channelId}
      editable={isOwn && !event.isLocalPending}
      eventId={event.eventId}
      minimal={isMinimal}
      name={displayName}
      paddingY="sm"
      paddingX="lg"
      spaceId={spaceId}
      reactions={reactions}
      relativeDate={isRelativeDate}
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
