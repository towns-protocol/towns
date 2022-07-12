import { MatrixContext } from "../components/MatrixContextProvider";
import { useContext, useMemo } from "react";
import { makeRoomIdentifierFromSlug, ZionContext } from "../types/matrix-types";

/// returns default space id if no space slug is provided
export function useSpaceId(slug: string | undefined = undefined) {
  const { defaultSpaceId } = useContext<ZionContext>(MatrixContext);
  return useMemo(
    () => (slug ? makeRoomIdentifierFromSlug(slug) : defaultSpaceId),
    [slug, defaultSpaceId],
  );
}
