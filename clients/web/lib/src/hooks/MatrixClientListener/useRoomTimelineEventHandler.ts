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
    setPowerLevels,
    setRoomName,
    setSpaceUpdateRecievedAt,
    updateMembership,
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
          console.log("m.room.message: " + event.event.event_id ?? "-", {
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
          console.log("space child", roomId, event);
          setSpaceUpdateRecievedAt(makeRoomIdentifier(roomId));
          break;
        }
        case "m.space.parent": {
          const childId = event.getRoomId();
          const roomId = event.getStateKey();
          if (!roomId || !childId) {
            console.error("m.space.parent event has no roomId or childId");
            break;
          }
          setSpaceUpdateRecievedAt(makeRoomIdentifier(roomId));
          break;
        }
        case "m.room.power_levels": {
          const roomId = event.getRoomId();
          const content = event.event.content;
          if (!roomId || !content) {
            console.error("m.room.power_levels event has no roomId or content");
            break;
          }
          console.log("power levels", roomId, content);
          setPowerLevels(makeRoomIdentifier(roomId), content);
          break;
        }
        default:
          console.log(`Unhandled Room.timeline event`, event.getType(), {
            event: event,
            roomId: room.roomId,
            toStartOfTimeline: toStartOfTimeline,
            removed: removed,
            data: data,
          });
          break;
      }
    },
    [
      createRoom,
      matrixClientRef,
      setNewMessage,
      setPowerLevels,
      setRoomName,
      setSpaceUpdateRecievedAt,
      updateMembership,
    ],
  );
  /* eslint-enable */
  return handleRoomTimelineEvent;
};
