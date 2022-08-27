import { useZionContext } from "../../components/ZionContextProvider";
import { useCallback } from "react";
import { useMatrixStore } from "../../store/use-matrix-store";
import { RoomIdentifier, SpaceChild } from "../../types/matrix-types";

export const useSyncSpace = () => {
  const { setSpace } = useMatrixStore();
  const { client } = useZionContext();
  return useCallback(
    async (spaceId: RoomIdentifier): Promise<SpaceChild[]> => {
      if (!client) {
        return Promise.resolve([]);
      }
      const hierarchy = await client.syncSpace(spaceId);
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
    [client, setSpace],
  );
};
