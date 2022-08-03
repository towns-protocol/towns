import { MatrixClient, Room as MatrixRoom } from "matrix-js-sdk";
import { IHierarchyRoom } from "matrix-js-sdk/lib/@types/spaces";
import { RoomHierarchy } from "matrix-js-sdk/lib/room-hierarchy";
import { RoomIdentifier } from "../../types/matrix-types";

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
