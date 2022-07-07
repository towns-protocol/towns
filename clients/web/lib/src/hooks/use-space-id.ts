import { useMemo } from "react";
import { useMatrixStore } from "../store/use-matrix-store";

export function useSpaceId(slug: string | undefined) {
  const { rooms } = useMatrixStore();
  return useMemo(
    () => (rooms && slug ? rooms[slug].id : undefined),
    [slug, rooms],
  );
}
