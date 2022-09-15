/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useState } from "react";
import {
  EventType,
  IRoomTimelineData,
  MatrixEvent,
  Room as MatrixRoom,
  RoomEvent,
} from "matrix-js-sdk";
import { ZionClient } from "../../client/ZionClient";
import { makeRoomIdentifier, SpaceItem } from "../../types/matrix-types";

export function useSpaces(
  client: ZionClient | undefined,
  spaceIds: string[],
): {
  spaces: SpaceItem[];
} {
  const [spaces, setSpaces] = useState<SpaceItem[]>([]);

  useEffect(() => {
    if (!client) {
      return;
    }
    const updateSpaces = () => {
      // don't bother with any deep comparision here, not expecting this to be called often
      setSpaces(
        spaceIds
          .map((spaceId) => {
            const room = client.getRoom(spaceId);
            if (!room) {
              return undefined;
            }
            return toSpaceItem(room);
          })
          .filter((space) => space !== undefined) as SpaceItem[],
      );
    };
    // set initial state
    updateSpaces();
    // freakin matrix updates the name after
    // the timeline, listen here to avoid "Empty room"
    // showing up when we create a space
    const onRoomEvent = (room: MatrixRoom) => {
      if (spaceIds.includes(room.roomId)) {
        updateSpaces();
      }
    };
    // subscribe to changes
    const onRoomTimelineEvent = (
      event: MatrixEvent,
      room: MatrixRoom,
      toStartOfTimeline: boolean,
      removed: boolean,
      data: IRoomTimelineData,
    ) => {
      // if the room is a space update our spaces
      if (spaceIds.includes(room.roomId)) {
        const eventType = event.getType();
        if (
          eventType === EventType.RoomCreate ||
          eventType === EventType.RoomName ||
          eventType === EventType.RoomAvatar
        ) {
          updateSpaces();
        } else if (
          eventType === EventType.RoomMember &&
          event.getStateKey() === client.getUserId()
        ) {
          updateSpaces();
        }
      }
    };

    client.on(RoomEvent.Name, onRoomEvent);
    client.on(RoomEvent.Timeline, onRoomTimelineEvent);
    return () => {
      client.removeListener(RoomEvent.Name, onRoomEvent);
      client.removeListener(RoomEvent.Timeline, onRoomTimelineEvent);
    };
  }, [client, spaceIds]);

  return { spaces };
}

function toSpaceItem(room: MatrixRoom): SpaceItem {
  return {
    id: makeRoomIdentifier(room.roomId),
    name: room.name,
    avatarSrc: room.getMxcAvatarUrl() ?? "/placeholders/nft_29.png",
  };
}
