import { useZionContext } from "../components/ZionContextProvider";
import { toRoomIdentifier } from "../types/matrix-types";

/// returns default space id if no space slug is provided
export function useSpaceId(slug: string | undefined = undefined) {
  const { defaultSpaceId } = useZionContext();
  return toRoomIdentifier(slug ?? defaultSpaceId);
}
