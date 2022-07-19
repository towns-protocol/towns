import { useMemo } from "react";
import { RoomIdentifier } from "../types/matrix-types";
import { useRoom } from "./use-room";

export function useMyMembership(
  inRoomId: RoomIdentifier | string | undefined,
): string {
  const room = useRoom(inRoomId);
  return useMemo(() => {
    return room?.membership ?? "";
  }, [room?.membership]);
}
