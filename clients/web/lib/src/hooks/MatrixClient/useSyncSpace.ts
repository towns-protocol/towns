import { MatrixContext } from "../../components/MatrixContextProvider";
import { MatrixClient } from "matrix-js-sdk";
import { RoomHierarchy } from "matrix-js-sdk/lib/room-hierarchy";
import { useCallback, useContext, useRef } from "react";
import { useMatrixStore } from "../../store/use-matrix-store";
import { RoomIdentifier, SpaceChild } from "../../types/matrix-types";

export const useSyncSpace = () => {
  const { setSpace } = useMatrixStore();

  const matrixClient = useContext<MatrixClient | undefined>(MatrixContext);
  const matrixRoomHierarchies = useRef<{ [slug: string]: RoomHierarchy }>({});
  return useCallback(
    async (spaceId: RoomIdentifier): Promise<SpaceChild[]> => {
      if (!matrixClient) {
        return Promise.resolve([]);
      }
      const room = matrixClient.getRoom(spaceId.matrixRoomId);
      if (!room) {
        console.log("couldn't find room for spcaceId:", spaceId);
        return Promise.resolve([]);
      }
      let roomHierarchy = matrixRoomHierarchies.current[spaceId.slug];
      if (!roomHierarchy) {
        roomHierarchy = new RoomHierarchy(room);
        matrixRoomHierarchies.current[spaceId.slug] = roomHierarchy;
      }
      while (roomHierarchy.canLoadMore || roomHierarchy.loading) {
        console.log("syncing space", spaceId.matrixRoomId);
        await roomHierarchy.load();
      }
      const space = setSpace(room, roomHierarchy);
      return Promise.resolve(space.children);
    },
    [matrixClient, setSpace],
  );
};
