import { useMemo } from "react";
import { Member, RoomIdentifier } from "../types/matrix-types";
import { useRoom } from "./use-room";

export function useMember(
  userId: string,
  inRoomId: RoomIdentifier | string | undefined,
): Member | undefined {
  const room = useRoom(inRoomId);
  return useMemo(() => room?.members[userId], [room?.members, userId]);
}
