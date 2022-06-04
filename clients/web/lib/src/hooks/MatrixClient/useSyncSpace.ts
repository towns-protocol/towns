import { MatrixContext } from "../../components/MatrixContextProvider";
import { MatrixClient } from "matrix-js-sdk";
import { RoomHierarchy } from "matrix-js-sdk/lib/room-hierarchy";
import { useCallback, useContext, useRef } from "react";
import { useMatrixStore } from "../../store/use-matrix-store";
import { SpaceChild } from "types/matrix-types";

export const useSyncSpace = () => {
  const { setSpace } = useMatrixStore();

  const matrixClient = useContext<MatrixClient | undefined>(MatrixContext);
  const matrixRoomHierarchies = useRef<{ [roomId: string]: RoomHierarchy }>({});
  return useCallback(
    async (spaceId: string): Promise<SpaceChild[]> => {
      if (!matrixClient) {
        return Promise.resolve([]);
      }
      const room = matrixClient.getRoom(spaceId);
      if (!room) {
        console.log("couldn't find room for spcaceId:", spaceId);
        return Promise.resolve([]);
      }
      let roomHierarchy = matrixRoomHierarchies.current[spaceId];
      if (!roomHierarchy) {
        roomHierarchy = new RoomHierarchy(room);
        matrixRoomHierarchies.current[spaceId] = roomHierarchy;
      }
      console.log("checking room H");
      while (roomHierarchy.canLoadMore || roomHierarchy.loading) {
        console.log("checking room H awaiting load!!");
        await roomHierarchy.load();
      }
      console.log("checking room H done!!");
      const space = setSpace(room, roomHierarchy);
      return Promise.resolve(space.children);
    },
    [matrixClient, setSpace],
  );
};
