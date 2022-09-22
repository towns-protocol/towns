/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useState } from "react";
import { Membership } from "../types/matrix-types";
import {
  HistoryVisibility,
  IRoomTimelineData,
  JoinRule,
  MatrixEvent,
  MatrixEventEvent,
  RelationType,
  RestrictedAllowType,
  Room as MatrixRoom,
  RoomEvent,
} from "matrix-js-sdk";
import { useZionContext } from "../components/ZionContextProvider";
import { enrichPowerLevels } from "../client/matrix/PowerLevels";
import {
  TimelineEvent,
  TimelineEvent_OneOf,
  ZTEvent,
} from "../types/timeline-types";
import { staticAssertNever } from "../utils/zion-utils";

// this code is dirty and jumbled, but it does what it needs to do, cleanup coming soon.

export function useTimeline(matrixRoom?: MatrixRoom): TimelineEvent[] {
  const { client } = useZionContext();
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  // console.log("use channel timeline!!!", matrixRoom !== undefined);

  useEffect(() => {
    if (!client || !matrixRoom) {
      // console.log("!!!! bailing out of useChannelTimeline");
      setTimeline((timeline) => (timeline.length > 0 ? [] : timeline));
      return;
    }
    // set the initial state, this effect only runs when the room reference changes, so
    // this should be a-okay
    // console.log(
    //  "!!!!initializing timeline",
    //  matrixRoom.getLiveTimeline().getEvents().length,
    //);
    let initialTimeline = matrixRoom.getLiveTimeline().getEvents();
    // for some reason the timeline doesn't filter replacements
    initialTimeline = initialTimeline.filter(
      (m) => !m.isRelation(RelationType.Replace),
    );

    setTimeline(initialTimeline.map(toEvent));

    const onRoomTimelineEvent = (
      event: MatrixEvent,
      eventRoom: MatrixRoom,
      toStartOfTimeline: boolean,
      removed: boolean,
      data: IRoomTimelineData,
    ) => {
      if (eventRoom.roomId !== matrixRoom.roomId) {
        return;
      }

      // console.log(
      //  "!!!! appending normal event",
      //  event.getId(),
      //  event.replacingEventId(),
      //  removed,
      //  toStartOfTimeline,
      //);

      const timelineEvent = toEvent(event);

      setTimeline((timeline) => {
        // console.log(
        //  "!!!! appending normal event2",
        //  event.getId(),
        //  event.replacingEventId(),
        //  removed,
        //  toStartOfTimeline,
        //);
        if (removed) {
          // console.log("!!!! appending removed");
          return timeline.filter((e) => e.eventId !== event.getId());
        }
        if (event.isRelation(RelationType.Replace)) {
          const replacingId = event.getWireContent()["m.relates_to"]?.event_id;
          if (replacingId) {
            // console.log("!!!! appending attempting replace");
            const eventIndex = timeline.findIndex(
              (value: TimelineEvent) => value.eventId === replacingId,
            );
            if (eventIndex !== -1) {
              // console.log("!!!! appending replacing event", replacingId);
              return [
                ...timeline.slice(0, eventIndex),
                timelineEvent,
                ...timeline.slice(eventIndex + 1),
              ];
            }
          }
        }
        if (toStartOfTimeline) {
          // console.log("!!!! appending to start of timeline");
          return [timelineEvent, ...timeline];
        }
        // console.log("!!!! appending to end");
        return [...timeline, timelineEvent];
      });

      // for local events, we can either set pendingEventOrdering: PendingEventOrdering.Detached,
      // and handle pending events in their own list, or we can add a listener to the event here and
      // replace it when it updates. Neither option is ideal, but the latter seems simpler.
      // ALSO - the MatrixEventEvent.Replaced seems to take care of some of this, but not always??
      if (timelineEvent.isLocalPending) {
        event.once(MatrixEventEvent.LocalEventIdReplaced, () => {
          // console.log(
          //  "!!!!local event replaced",
          //  timelineEvent.eventId,
          //  event.getId(),
          //  timelineEvent.fallbackContent,
          //);
          setTimeline((timeline) => {
            const index = timeline.findIndex(
              (e) => e.eventId === timelineEvent.eventId,
            );
            if (index === -1) {
              // console.log("!!!!local event not found", timelineEvent.eventId);
              return timeline;
            }
            return [
              ...timeline.slice(0, index),
              toEvent(event),
              ...timeline.slice(index + 1),
            ];
          });
        });
      }
    };
    const onEventDecrypted = (event: MatrixEvent) => {
      if (event.getRoomId() !== matrixRoom.roomId) {
        return;
      }
      // console.log("!!!! replacing decrypted event", event.getId());
      setTimeline((timeline) => {
        const eventIndex = timeline.findIndex(
          (value: TimelineEvent) => value.eventId == event.getId(),
        );
        if (eventIndex === -1) {
          return [...timeline, toEvent(event)];
        } else {
          return [
            ...timeline.slice(0, eventIndex),
            toEvent(event),
            ...timeline.slice(eventIndex + 1),
          ];
        }
      });
    };

    const onRoomRedaction = (event: MatrixEvent, eventRoom: MatrixRoom) => {
      if (eventRoom.roomId !== matrixRoom.roomId) {
        return;
      }
      if (!event.event.redacts) {
        console.error("redaction event has no redacts field");
        return;
      }
      // console.log("!!!!redacting event", event.event.redacts);
      setTimeline((timeline) =>
        timeline.filter((e) => e.eventId !== event.event.redacts),
      );
    };

    const onEventReplaced = (event: MatrixEvent) => {
      if (event.getRoomId() !== matrixRoom.roomId) {
        return;
      }
      const replacingId = event.replacingEventId();
      if (replacingId?.startsWith("")) {
        // console.log("ignoring local event replaced");
        // will swap out the id in the LocalEventIdReplaced listener
        return;
      }
      // console.log("!!!! onReplaced event", event.getId(), replacingId);
      setTimeline((timeline) => {
        const eventIndex = timeline.findIndex(
          (value: TimelineEvent) => value.eventId === replacingId,
        );
        if (eventIndex === -1) {
          // console.log("!!!! onReplaced event not found", replacingId);
          return timeline;
        }
        // console.log("!!!! onReplaced event found", replacingId);
        return [
          ...timeline.slice(0, eventIndex),
          toEvent(event),
          ...timeline.slice(eventIndex + 1),
        ];
      });
    };
    /*

event.replacingEventId
event.isRedacted
event.redact
*/

    // console.log("!!! ADDING EVENTS");
    matrixRoom.on(RoomEvent.Timeline, onRoomTimelineEvent);
    matrixRoom.on(RoomEvent.Redaction, onRoomRedaction);
    // cli.on(RoomEvent.TimelineReset, this.onRoomTimelineReset);
    // cli.on(RoomEvent.RedactionCancelled, this.onRoomRedaction);
    client.on(MatrixEventEvent.Decrypted, onEventDecrypted);
    client.on(MatrixEventEvent.Replaced, onEventReplaced);
    return () => {
      // console.log("!!! REMOVING EVENTS");
      matrixRoom.removeListener(RoomEvent.Timeline, onRoomTimelineEvent);
      matrixRoom.removeListener(RoomEvent.Redaction, onRoomRedaction);
      client.removeListener(MatrixEventEvent.Decrypted, onEventDecrypted);
      client.removeListener(MatrixEventEvent.Replaced, onEventReplaced);
    };
  }, [client, matrixRoom]);

  return timeline;
}

function toEvent(event: MatrixEvent): TimelineEvent {
  const { content, error } = toZionContent(event);
  const fbc = `${event.getType()} ${getFallbackContent(event, content, error)}`;
  // console.log("!!!! to event", event.getId(), fbc);
  return {
    eventId: event.getId(),
    eventType: event.getType(),
    originServerTs: event.getTs(),
    content: content,
    fallbackContent: fbc,
    isLocalPending: event.getId().startsWith("~"),
  };
}

function toZionContent(event: MatrixEvent): {
  content?: TimelineEvent_OneOf;
  error?: string;
} {
  const describe = () => {
    return `${event.getType()} id: ${event.getId()}`;
  };
  const content = event.getContent();
  const eventType = event.getType() as ZTEvent;

  switch (eventType) {
    case ZTEvent.Reaction: {
      const relation = event.getRelation();
      const targetEventId = relation?.event_id;
      const reaction = relation?.key;
      if (!targetEventId || !reaction) {
        return {
          error: `${describe()} invalid reaction event`,
        };
      }
      return {
        content: {
          kind: eventType,
          sender: {
            id: event.getSender(),
            displayName: event.sender?.rawDisplayName ?? event.getSender(),
            avatarUrl: event.sender.getMxcAvatarUrl() ?? undefined,
          },
          targetEventId: targetEventId,
          reaction: reaction,
        },
      };
    }
    case ZTEvent.RoomAvatar:
      return {
        content: {
          kind: eventType,
          url: content.url as string,
        },
      };
    case ZTEvent.RoomCanonicalAlias:
      return {
        content: {
          kind: eventType,
          alias: content.alias as string,
          altAliases: content.alt_aliases as string[] | undefined,
        },
      };
    case ZTEvent.RoomCreate:
      return {
        content: {
          kind: eventType,
          creator: content.creator as string,
          predecessor: content.predecessor as {
            event_id: string;
            room_id: string;
          },
          type: content.type as string | undefined,
        },
      };
    case ZTEvent.RoomEncrypted:
      return {
        content: {
          kind: eventType,
        },
      };
    case ZTEvent.RoomHistoryVisibility: {
      const visibility = content.history_visibility as HistoryVisibility;
      if (!visibility) {
        return {
          error: `${describe()} event has no history_visibility`,
        };
      }
      return {
        content: {
          kind: eventType,
          historyVisibility: visibility,
        },
      };
    }
    case ZTEvent.RoomJoinRules:
      return {
        content: {
          kind: eventType,
          joinRule: content.join_rule as JoinRule,
          allow: content.allow as
            | { room_id: string; type: RestrictedAllowType }[]
            | undefined,
        },
      };
    case ZTEvent.RoomName:
      return {
        content: {
          kind: eventType,
          name: content.name as string,
        },
      };
    case ZTEvent.RoomMember: {
      const memberId = event.getStateKey();
      if (!memberId) {
        return {
          error: `${describe()} has no state key`,
        };
      }
      return {
        content: {
          kind: eventType,
          userId: memberId,
          avatarUrl: content.avatar_url,
          displayName: content.displayname,
          isDirect: !!content.is_direct,
          membership: content.membership as Membership,
          reason: content.reason as string | undefined,
        },
      };
    }
    case ZTEvent.RoomMessage: {
      if (!event.getSender() || !content.msgtype) {
        return {
          error: `${describe()} has no sender, or msgtype`,
        };
      }
      return {
        content: {
          kind: eventType,
          sender: {
            id: event.getSender(),
            displayName: event.sender?.rawDisplayName ?? event.getSender(),
            avatarUrl: event.sender.getMxcAvatarUrl() ?? undefined,
          },
          inReplyTo: event.replyEventId,
          body: content.body as string,
          msgType: content.msgtype,
          content: content,
        },
      };
    }
    case ZTEvent.RoomPowerLevels:
      return {
        content: {
          kind: eventType,
          ...enrichPowerLevels(content),
        },
      };
    case ZTEvent.RoomRedaction: {
      if (!event.getSender()) {
        return {
          error: `${describe()} has no sender`,
        };
      }
      return {
        content: {
          kind: eventType,
          sender: {
            id: event.getSender(),
            displayName: event.sender?.rawDisplayName ?? event.getSender(),
            avatarUrl: event.sender.getMxcAvatarUrl() ?? undefined,
          },
          inReplyTo: event.replyEventId,
          content: content,
        },
      };
    }
    case ZTEvent.SpaceChild: {
      const childId = event.getStateKey();
      if (!childId) {
        return {
          error: `${describe()} has no state key`,
        };
      }
      return {
        content: {
          kind: eventType,
          childId: childId,
        },
      };
    }
    case ZTEvent.SpaceParent: {
      const parentId = event.getStateKey();
      if (!parentId) {
        return {
          error: `${describe()} has no state key`,
        };
      }
      return {
        content: {
          kind: eventType,
          parentId: parentId,
        },
      };
    }

    default:
      console.log(`Unhandled Room.timeline event`, event.getType(), {
        event: event,
        roomId: event.getRoomId(),
      });
      return {
        error: `${describe()} unhandled`,
      };
  }
}

function getFallbackContent(
  event: MatrixEvent,
  content?: TimelineEvent_OneOf,
  error?: string,
): string {
  if (error) {
    return error;
  }
  if (!content) {
    throw new Error("Either content or error should be defined");
  }
  const eventType = event.getType();
  switch (content.kind) {
    case ZTEvent.Reaction:
      return `${content.sender.displayName} reacted with ${content.reaction} to ${content.targetEventId}`;
    case ZTEvent.RoomAvatar:
      return `url: ${content.url ?? "undefined"}`;
    case ZTEvent.RoomCanonicalAlias: {
      const alt = (content.altAliases ?? []).join(", ");
      return `alias: ${content.alias}, alt alaises: ${alt}`;
    }
    case ZTEvent.RoomCreate:
      return `type: ${content.type ?? "none"}`;
    case ZTEvent.RoomEncrypted:
      return `~Encrypted~`;
    case ZTEvent.RoomHistoryVisibility:
      return `newValue: ${content.historyVisibility}`;
    case ZTEvent.RoomJoinRules:
      return `newValue: ${content.joinRule}`;
    case ZTEvent.RoomMember: {
      const name = content.displayName ?? content.userId;
      const avatar = content.avatarUrl ?? "none";
      return `[${content.membership}] name: ${name} avatar: ${avatar}`;
    }
    case ZTEvent.RoomMessage:
      return `${content.sender.displayName}: ${content.body}`;
    case ZTEvent.RoomName:
      return `newValue: ${content.name}`;
    case ZTEvent.RoomRedaction:
      return `${content.sender.displayName}: ~Redacted~`;
    case ZTEvent.RoomPowerLevels:
      return `${eventType}`;
    case ZTEvent.SpaceChild:
      return `childId: ${content.childId}`;
    case ZTEvent.SpaceParent:
      return `parentId: ${content.parentId}`;
    default:
      staticAssertNever(content);
      return `Unreachable`;
  }
}
