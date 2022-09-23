import { useMemo } from "react";
import useEvent from "react-use-event-hook";
import {
  RoomIdentifier,
  TimelineEvent,
  ZTEvent,
  useZionClient,
} from "use-zion-client";

export type MessageReactions = Map<string, Map<string, { eventId: string }>>;
export type ChannelReactionsMap = Map<string, MessageReactions>;

/**
 * Map<eventId,
 *  Map<reactionName,
 *    Map<userId,
 *      { eventId: string }
 *    >
 *  >
 * >
 */
export const useTimelineReactionsMap = (events: TimelineEvent[]) => {
  return useMemo(
    () =>
      events.reduce((reactionsMap, m) => {
        const content =
          m.content?.kind === ZTEvent.Reaction ? m.content : undefined;

        const parentId = content && content.targetEventId;

        if (parentId) {
          const reaction = content.reaction;

          let messageReactions = reactionsMap.get(parentId);

          if (typeof messageReactions === "undefined") {
            messageReactions = new Map();
            reactionsMap.set(parentId, messageReactions);
          }

          let reactionUserIds = messageReactions.get(reaction);

          if (typeof reactionUserIds === "undefined") {
            reactionUserIds = new Map();
            messageReactions.set(reaction, reactionUserIds);
          }

          reactionUserIds.set(content.sender.id, {
            eventId: m.eventId,
          });
        }

        return reactionsMap;
      }, new Map() as ChannelReactionsMap),
    [events],
  );
};

export const useHandleReaction = (channelId: RoomIdentifier) => {
  const { sendReaction, redactEvent } = useZionClient();
  const handleReaction = useEvent(
    (
      action:
        | {
            type: "add";
            parentId: string;
            reactionName: string;
          }
        | {
            type: "redact";
            eventId: string;
          },
    ) => {
      if (action.type === "add") {
        sendReaction(channelId, action.parentId, action.reactionName);
      } else if (action.type === "redact") {
        redactEvent(channelId, action.eventId);
      }
    },
  );
  return handleReaction;
};
