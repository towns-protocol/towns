import { MatrixContext } from "../components/MatrixContextProvider";
import { useContext } from "react";
import { toRoomIdentifier, ZionContext } from "../types/matrix-types";

/// returns default space id if no space slug is provided
export function useSpaceId(slug: string | undefined = undefined) {
  const { defaultSpaceId } = useContext<ZionContext>(MatrixContext);
  return toRoomIdentifier(slug ?? defaultSpaceId);
}
