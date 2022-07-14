import { MatrixClient, MatrixEvent, Room } from "matrix-js-sdk";
import { MutableRefObject, useCallback } from "react";
import { makeRoomIdentifier, Membership } from "../../types/matrix-types";
import { useMatrixStore } from "../../store/use-matrix-store";

export const useRoomTimelineEventHandler = (
  matrixClientRef: MutableRefObject<MatrixClient | undefined>,
) => {
  const {
    createRoom,
    setNewMessage,
    setRoomName,
    updateMembership,
    createSpaceChild,
  } = useMatrixStore();

  /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
  const handleRoomTimelineEvent = useCallback(
    function (
      event: MatrixEvent,
      room: Room,
      toStartOfTimeline: any,
      removed: any,
      data: any,
    ) {
      if (!matrixClientRef.current) {
        console.log(`matrixClientRef.current is undefined`);
        return;
      }
      switch (event.getType()) {
        case "m.room.message": {
          console.log("m.room.message", {
            event: event,
            toStart: toStartOfTimeline,
            removed: removed,
            data: data,
          });
          if (
            !event.sender ||
            !event.event.event_id ||
            !event.event.content ||
            !event.event.content.msgtype
          ) {
            console.error("m.room.message event has no event_id or content");
            break;
          }
          setNewMessage(makeRoomIdentifier(room.roomId), {
            eventId: event.event.event_id,
            sender: event.sender.name,
            body: event.event.content.body,
            msgType: event.event.content.msgtype,
            content: event.event.content,
            originServerTs: event.event.content.origin_server_ts,
          });
          break;
        }
        case "m.room.create": {
          createRoom(makeRoomIdentifier(room.roomId), room.isSpaceRoom());
          break;
        }
        case "m.room.name": {
          const roomId = event.getRoomId();
          const name = event.getContent().name;
          if (!roomId) {
            console.error("m.room.name event has no roomId");
            break;
          }
          setRoomName(makeRoomIdentifier(roomId), name);
          break;
        }
        case "m.room.member": {
          const roomId = event.getRoomId();
          const userId = event.getStateKey();
          const membership = event.getContent().membership as Membership;
          if (!roomId || !membership) {
            console.error("m.room.member event has no roomId or membership");
            break;
          }
          if (roomId && userId && membership) {
            updateMembership(
              makeRoomIdentifier(roomId),
              userId,
              membership,
              matrixClientRef.current.getUserId() === userId,
            );
          }
          break;
        }
        case "m.space.child": {
          const roomId = event.getRoomId();
          const childId = event.getStateKey();
          if (!roomId || !childId) {
            console.error("m.space.child event has no roomId or childId");
            break;
          }
          createSpaceChild(
            makeRoomIdentifier(roomId),
            makeRoomIdentifier(childId),
          );
          break;
        }
        default:
          console.log(`Unhandled Room.timeline event`, event.getType(), event);
          break;
      }
    },
    [
      createRoom,
      createSpaceChild,
      matrixClientRef,
      setNewMessage,
      setRoomName,
      updateMembership,
    ],
  );
  /* eslint-enable */
  return handleRoomTimelineEvent;
};
