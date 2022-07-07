import { useEffect, useMemo } from "react";
import { useMatrixStore } from "../store/use-matrix-store";
import { useMatrixClient } from "./use-matrix-client";

export function useSpace(slug: string | undefined) {
  const { spaces } = useMatrixStore();
  const { rooms } = useMatrixStore();
  const { syncSpace } = useMatrixClient();
  const spaceRoom = useMemo(
    () => (rooms && slug ? rooms[slug] : undefined),
    [slug, rooms],
  );

  useEffect(() => {
    void (async () => {
      try {
        if (spaceRoom?.id) {
          await syncSpace(spaceRoom?.id);
        }
      } catch (reason: unknown) {
        console.log("SpacesIndex error:", reason);
      }
    })();
  }, [spaceRoom?.id, syncSpace]);

  return useMemo(
    () => (slug && spaces ? spaces[slug] : undefined),
    [slug, spaces],
  );
}
