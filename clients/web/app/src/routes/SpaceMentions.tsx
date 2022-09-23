import { RelationType } from "matrix-js-sdk";
import React from "react";
import { Outlet } from "react-router";
import { firstBy } from "thenby";
import {
  Channel,
  TimelineEvent,
  ZTEvent,
  toEvent,
  useMatrixStore,
  useMyProfile,
  useSpaceData,
  useSpaceId,
  useZionContext,
} from "use-zion-client";
import { NavLink } from "react-router-dom";
import { Box, Stack } from "@ui";
import { RichTextPreview } from "@components/RichText/RichTextEditor";
import { Message } from "@components/Message";
import {
  getIsRoomMessageContent,
  getMessageBody,
  getParentEvent,
} from "utils/ztevent_util";
export const SpaceMentions = () => {
  const profile = useMyProfile();

  const { mentionCounts } = useZionContext();
  const { userId } = useMatrixStore();
  const { client } = useZionContext();

  const data = useSpaceData();

  const profileMatcher = new RegExp(`@${profile?.displayName}`);

  if (!data) {
    return null;
  }

  const { channelGroups } = data;

  type MentionResult = {
    unread: boolean;
    type: "mention";
    channel: Channel;
    timestamp: number;
    event: TimelineEvent;
    thread?: TimelineEvent;
  };

  type ReactionResult = {
    unread: boolean;
    type: "reaction";
    channel: Channel;
    timestamp: number;
    reaction: {
      reaction: string;
      sender: string;
    };
    event: TimelineEvent;
    parentEvent?: TimelineEvent;
  };

  type Result = MentionResult | ReactionResult;

  const result = [] as Result[];

  // flatmap channels
  const channels = channelGroups.reduce((channels, group) => {
    return [...channels, ...group.channels];
  }, [] as Channel[]);

  channels.forEach((channel) => {
    const timeline = client?.getRoom(channel.id)?.timeline;

    if (!timeline?.length) return;

    let unreadMentions = mentionCounts[channel.id.matrixRoomId] || 0;

    const redactedTimeline = timeline
      .filter(
        (e) =>
          e.getContent()["m.relates_to"]?.rel_type !== RelationType.Replace,
      )
      .map(toEvent)
      .slice()
      .reverse();

    redactedTimeline.forEach((event) => {
      const content = event.content;
      const hasUnreadMentions = unreadMentions > 0;
      if (content?.kind === ZTEvent.RoomMessage) {
        if (profileMatcher.test(content.body)) {
          let thread = getParentEvent(event, redactedTimeline, true);
          thread = thread?.eventId !== event.eventId ? thread : undefined;

          result.push({
            type: "mention",
            unread: hasUnreadMentions,
            thread,
            channel,
            event,
            timestamp: event.originServerTs,
          });

          if (hasUnreadMentions) {
            // unread mentions only counts for unread messages
            unreadMentions--;
          }
        }
      } else if (content?.kind === ZTEvent.Reaction) {
        if (hasUnreadMentions) {
          // unread mentions only counts for unread messages
          unreadMentions--;
        }

        const parentEvent: TimelineEvent | undefined = redactedTimeline.find(
          (e) =>
            e.eventId === content.targetEventId &&
            e.content?.kind === ZTEvent.RoomMessage &&
            e.content.sender.id === userId,
        );

        if (parentEvent) {
          result.push({
            type: "reaction",
            unread: false,
            parentEvent,
            channel,
            event,
            reaction: {
              sender: content.sender.displayName,
              reaction: content.reaction,
            },
            timestamp: event.originServerTs,
          });
        }
      }
    });
  });

  result.sort(
    firstBy<MentionResult>((m) => (m.unread ? 0 : 1)).thenBy(
      (a) => a.timestamp,
      -1,
    ),
  );

  return (
    <Stack grow horizontal>
      <Stack grow gap>
        <Stack padding="md" gap="md">
          {result.map((m, index, mentions) => {
            return m.type === "mention" && <MentionBox mention={m} />;
          })}
        </Stack>
      </Stack>
      <Outlet />
    </Stack>
  );
};

type MentionResult = {
  unread: boolean;
  type: "mention";
  channel: Channel;
  timestamp: number;
  event: TimelineEvent;
  thread?: TimelineEvent;
};

const MentionBox = (props: { mention: MentionResult }) => {
  const { mention } = props;
  const { slug: spaceSlug } = useSpaceId() ?? {};
  const { slug: channelSlug } = mention.channel.id;

  const content = getIsRoomMessageContent(mention.event);

  if (!content) {
    return null;
  }

  const channelSegment = `/spaces/${spaceSlug}/channels/${channelSlug}`;
  const threadSegment = mention.thread
    ? `/replies/${mention.thread.eventId}`
    : ``;
  const eventSegment = `#${mention.event.eventId}`;

  const link = `${channelSegment}${threadSegment}${eventSegment}`;

  return (
    <NavLink to={link}>
      <Box
        border
        rounded="xs"
        background={mention.unread ? "level2" : undefined}
        cursor="alias"
      >
        <Message
          padding
          relativeDate
          key={mention.event.eventId}
          messageSourceAnnotation={`${
            mention.thread ? `Thread in` : ``
          } #${mention.channel.label.toLowerCase()}`}
          timestamp={mention.event.originServerTs}
          userId={content.sender.id}
          avatar={content.sender.avatarUrl}
          name={content.sender.displayName}
        >
          <RichTextPreview
            content={getMessageBody(mention.event.eventId, content)}
            edited={
              content.content["m.relates_to"]?.rel_type === RelationType.Replace
            }
          />
        </Message>
      </Box>
    </NavLink>
  );
};
