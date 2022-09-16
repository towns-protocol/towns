import { RoomMember } from "matrix-js-sdk";
import { useMemo } from "react";
import { useZionContext } from "../components/ZionContextProvider";

/**
 * Returns all members from all rooms
 */
export function useSpaceMembers() {
  const { client } = useZionContext();
  return useMemo(() => {
    const members = new Map<string, RoomMember>();
    const rooms = client?.getRooms();
    rooms?.forEach((r) => {
      r.getMembers().forEach((m) => {
        if (m?.userId) {
          members.set(m.userId, m);
        }
      });
    }, members) ?? members;
    return Array.from(members).map((m) => m[1]);
  }, [client]);
}
