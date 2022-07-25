import { RoomIdentifier, toRoomIdentifier } from "../types/matrix-types";
import { useMatrixStore } from "../store/use-matrix-store";
import { useMemo } from "react";

export const useMessages = (slugOrId: RoomIdentifier | string | undefined) => {
  const { allMessages } = useMatrixStore();
  const roomId = toRoomIdentifier(slugOrId);

  return useMemo(
    () => (allMessages && roomId?.slug ? allMessages[roomId.slug] ?? [] : []),
    [allMessages, roomId?.slug],
  );
};
