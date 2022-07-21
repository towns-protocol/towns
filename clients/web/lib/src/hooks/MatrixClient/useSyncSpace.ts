import { MatrixContext } from "../../components/MatrixContextProvider";
import { RoomHierarchy } from "matrix-js-sdk/lib/room-hierarchy";
import { useCallback, useContext } from "react";
import { useMatrixStore } from "../../store/use-matrix-store";
import {
  RoomIdentifier,
  SpaceChild,
  ZionContext,
} from "../../types/matrix-types";
import { MatrixClient, Room as MatrixRoom } from "matrix-js-sdk";
import { IHierarchyRoom } from "matrix-js-sdk/lib/@types/spaces";

export const useSyncSpace = () => {
  const { setSpace, userId } = useMatrixStore();
  const { matrixClient } = useContext<ZionContext>(MatrixContext);
  return useCallback(
    async (spaceId: RoomIdentifier): Promise<SpaceChild[]> => {
      if (!matrixClient || !userId) {
        return Promise.resolve([]);
      }
      const hierarchy = await syncZionSpace(matrixClient, spaceId, userId);
      if (!hierarchy) {
        console.log("syncZionSpace failed", spaceId);
        return Promise.resolve([]);
      }
      const spaceHierarchy = setSpace(
        spaceId,
        hierarchy.root,
        hierarchy.children,
      );
      return Promise.resolve(spaceHierarchy.children);
    },
    [matrixClient, setSpace, userId],
  );
};

export async function syncZionSpace(
  client: MatrixClient,
  spaceId: RoomIdentifier,
  userId: string,
): Promise<{ root: IHierarchyRoom; children: IHierarchyRoom[] } | undefined> {
  const matrixRoom =
    client.getRoom(spaceId.matrixRoomId) ||
    new MatrixRoom(spaceId.matrixRoomId, client, userId);
  const roomHierarchy = new RoomHierarchy(matrixRoom);
  try {
    while (roomHierarchy.canLoadMore || roomHierarchy.loading) {
      console.log("syncing space", spaceId.matrixRoomId);
      await roomHierarchy.load();
    }
  } catch (reason) {
    console.error("syncing space error", spaceId.matrixRoomId, reason);
  }
  const root = roomHierarchy.rooms
    ? roomHierarchy.rooms.find((r) => r.room_id === spaceId.matrixRoomId)
    : undefined;
  const children = roomHierarchy.rooms
    ? roomHierarchy.rooms.filter((r) => r.room_id !== spaceId.matrixRoomId)
    : [];
  if (!root) {
    console.error(
      "syncing space error",
      spaceId.matrixRoomId,
      "no root",
      roomHierarchy,
    );
    return undefined;
  }
  return { root: root, children: children };
}
