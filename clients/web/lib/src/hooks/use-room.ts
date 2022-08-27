import { useZionContext } from "../components/ZionContextProvider";
import { useMemo } from "react";
import { useMatrixStore } from "../store/use-matrix-store";
import { Room, RoomIdentifier, toRoomIdentifier } from "../types/matrix-types";

export function useRoom(
  slugOrId: RoomIdentifier | string | undefined,
): Room | undefined {
  const { defaultSpaceId, defaultSpaceName } = useZionContext();
  const { rooms } = useMatrixStore();
  const roomId = toRoomIdentifier(slugOrId ?? defaultSpaceId);
  return useMemo(() => {
    if (roomId && rooms && rooms[roomId.slug]) {
      return rooms[roomId.slug];
    } else if (
      defaultSpaceId &&
      roomId?.matrixRoomId == defaultSpaceId.matrixRoomId
    ) {
      // this bit is temporary because client.peek(...) ("rooms_initial_sync") is unimplemented in dendrite https://github.com/HereNotThere/harmony/issues/188
      const defaultSpaceRoom: Room = {
        id: defaultSpaceId,
        name: defaultSpaceName ?? "Default Space",
        members: {},
        membership: "",
        isSpaceRoom: true,
      };
      return defaultSpaceRoom;
    }
    return undefined;
  }, [defaultSpaceId, defaultSpaceName, roomId, rooms]);
}
