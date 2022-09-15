import { IRoomTimelineData, MatrixEvent, Room } from "matrix-js-sdk";
import { MutableRefObject, useCallback } from "react";
import { makeRoomIdentifier, Membership } from "../../types/matrix-types";
import { useMatrixStore } from "../../store/use-matrix-store";
import { ZionClient } from "../../client/ZionClient";

export const useRoomTimelineEventHandler = (
  matrixClientRef: MutableRefObject<ZionClient | undefined>,
) => {
  const { createRoom, setPowerLevels, setRoomName, updateMembership } =
    useMatrixStore();

  /* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
  const handleRoomTimelineEvent = useCallback(
    function (
      event: MatrixEvent,
      room: Room,
      toStartOfTimeline: boolean,
      removed: boolean,
      data: IRoomTimelineData,
    ) {
      if (!matrixClientRef.current) {
        console.log(`matrixClientRef.current is undefined`);
        return;
      }
      // console.log("handleRoomTimelineEvent", event.getType());
      const content = event.getContent();
      switch (event.getType()) {
        case "m.room.message": {
          // implemented with timeline event
          break;
        }
        case "m.room.create": {
          createRoom(makeRoomIdentifier(room.roomId), room.isSpaceRoom());
          break;
        }
        case "m.room.name": {
          const roomId = event.getRoomId();
          const name = event.getContent().name as string;
          if (!roomId || !name) {
            console.error("m.room.name event has no roomId or no name");
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
          //console.log("space child", roomId, childId);
          break;
        }
        case "m.space.parent": {
          const childId = event.getRoomId();
          const roomId = event.getStateKey();
          if (!roomId || !childId) {
            console.error("m.space.parent event has no roomId or childId");
            break;
          }
          //console.log("space parent", roomId, childId);
          break;
        }
        case "m.room.power_levels": {
          const roomId = event.getRoomId();
          const content = event.getContent();
          if (!roomId || !content) {
            console.error("m.room.power_levels event has no roomId or content");
            break;
          }
          //console.log("power levels", roomId, content);
          setPowerLevels(makeRoomIdentifier(roomId), content);
          break;
        }
        case "m.room.encrypted": {
          // encrypted events are reparsed after a MatrixEventEvent.Decrypted event
          //console.log("encrypted event for room:", event.getRoomId());
          break;
        }
        default:
          // console.log(`Unhandled Room.timeline event`, event.getType(), {
          //   event: event,
          //   roomId: room.roomId,
          //   toStartOfTimeline: toStartOfTimeline,
          //   removed: removed,
          //   data: data,
          // });
          break;
      }
    },
    [
      createRoom,
      matrixClientRef,
      setPowerLevels,
      setRoomName,
      updateMembership,
    ],
  );
  /* eslint-enable */
  return handleRoomTimelineEvent;
};
