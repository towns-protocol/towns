import { MatrixClient } from "matrix-js-sdk";
import { MutableRefObject, useCallback } from "react";
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
      event: any,
      room: any,
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
          setNewMessage(room.roomId, {
            eventId: event.event.event_id,
            sender: event.sender.name,
            body: event.event.content.body,
            msgType: event.event.content.msgtype,
            originServerTs: event.event.content.origin_server_ts,
          });
          break;
        }
        case "m.room.create": {
          createRoom(room.roomId, room.isSpaceRoom());
          break;
        }
        case "m.room.name": {
          const roomId = event.getRoomId();
          const name = event.getContent().name;
          setRoomName(roomId, name);
          break;
        }
        case "m.room.member": {
          const roomId = event.getRoomId();
          const userId = event.getStateKey();
          const membership = event.getContent().membership;
          if (roomId && userId && membership) {
            updateMembership(
              roomId,
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
          createSpaceChild(roomId, childId);
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
