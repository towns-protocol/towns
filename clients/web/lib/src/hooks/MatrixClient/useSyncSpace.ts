import { MatrixContext } from "../../components/MatrixContextProvider";
import { RoomHierarchy } from "matrix-js-sdk/lib/room-hierarchy";
import { useCallback, useContext, useRef } from "react";
import { useMatrixStore } from "../../store/use-matrix-store";
import {
  RoomIdentifier,
  SpaceChild,
  ZionContext,
} from "../../types/matrix-types";
import { Room as MatrixRoom } from "matrix-js-sdk";

export const useSyncSpace = () => {
  const { setSpace, userId, rooms } = useMatrixStore();
  const { matrixClient } = useContext<ZionContext>(MatrixContext);
  const matrixRoomHierarchies = useRef<{ [slug: string]: RoomHierarchy }>({});
  return useCallback(
    async (spaceId: RoomIdentifier): Promise<SpaceChild[]> => {
      const zionRoom = rooms ? rooms[spaceId.slug] : null;
      if (!matrixClient || !userId || !zionRoom) {
        return Promise.resolve([]);
      }
      const matrixRoom =
        matrixClient.getRoom(spaceId.matrixRoomId) ||
        new MatrixRoom(spaceId.matrixRoomId, matrixClient, userId);

      let roomHierarchy = matrixRoomHierarchies.current[spaceId.slug];
      if (!roomHierarchy) {
        roomHierarchy = new RoomHierarchy(matrixRoom);
        matrixRoomHierarchies.current[spaceId.slug] = roomHierarchy;
      }
      try {
        while (roomHierarchy.canLoadMore || roomHierarchy.loading) {
          console.log("syncing space", spaceId.matrixRoomId);
          await roomHierarchy.load();
        }
      } catch (reason) {
        console.error("syncing space error", spaceId.matrixRoomId, reason);
      }
      console.log("syncing synced space", spaceId.matrixRoomId, roomHierarchy);
      const root = roomHierarchy.rooms.find(
        (r) => r.room_id === spaceId.matrixRoomId,
      );
      const children = roomHierarchy.rooms.filter(
        (r) => r.room_id !== spaceId.matrixRoomId,
      );
      if (!root) {
        console.error(
          "syncing space error",
          spaceId.matrixRoomId,
          "no root",
          roomHierarchy,
        );
        return Promise.resolve([]);
      }
      const spaceHierarchy = setSpace(spaceId, root, children);
      return Promise.resolve(spaceHierarchy.children);
    },
    [matrixClient, rooms, setSpace, userId],
  );
};
