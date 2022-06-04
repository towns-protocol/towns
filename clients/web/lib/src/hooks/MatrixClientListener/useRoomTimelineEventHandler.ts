import { MatrixClient } from "matrix-js-sdk";
import { MutableRefObject, useCallback } from "react";
import { useMatrixStore } from "../../store/use-matrix-store";

export const useRoomTimelineEventHandler = (
  matrixClientRef: MutableRefObject<MatrixClient | undefined>,
) => {
  const { createRoom, setNewMessage, setRoomName, updateMembership } =
    useMatrixStore();

  const handleRoomTimelineEvent = useCallback(
    function (
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      event: any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      room: any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
      toStartOfTimeline: any,
    ) {
      console.log(`RoomTimelineEvent`, {
        eventType: event.getType(),
        roomId: room.roomId,
      });
      if (!matrixClientRef.current) {
        console.log(`matrixClientRef.current is undefined`);
        return;
      }
      switch (event.getType()) {
        case "m.room.message": {
          console.log(
            `Room[${room.roomId}]: ${event.sender.name}, ${event.event.content.body}`,
          );
          setNewMessage(
            room.roomId,
            event.sender.name,
            event.event.content.body,
          );
          break;
        }
        case "m.room.create": {
          console.log(`m.room.create`, { roomId: room.roomId });
          createRoom(room.roomId, room.isSpaceRoom());
          break;
        }
        case "m.room.name": {
          const roomId = event.getRoomId();
          const name = event.getContent().name;
          console.log(`m.room.name`, {
            roomId,
            name,
          });
          setRoomName(roomId, name);
          break;
        }
        case "m.room.member": {
          const roomId = event.getRoomId();
          const userId = event.getStateKey();
          const membership = event.getContent().membership;
          console.log(`m.room.member`, {
            roomId,
            userId,
            membership,
            content: event.getContent(),
            event: JSON.stringify(event),
          });

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
        // case "m.space.child": {
        //   const roomId = event.getRoomId();
        //   const childId = event.getStateKey();
        //   if (event.getContent()) {
        //   } else {

        //   }
        // }
        default:
          console.log(`Unhandled Room.timeline event`, event);
          break;
      }
    },
    [createRoom, matrixClientRef, setNewMessage, setRoomName, updateMembership],
  );

  return handleRoomTimelineEvent;
};
