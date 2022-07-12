import { makeRoomIdentifierFromSlug } from "../types/matrix-types";
import { useMatrixStore } from "../store/use-matrix-store";
import { useMemo } from "react";

export const useMessages = (channelSlug: string | undefined) => {
  const { allMessages } = useMatrixStore();
  const roomId = channelSlug
    ? makeRoomIdentifierFromSlug(channelSlug)
    : undefined;

  return useMemo(
    () => (allMessages && roomId?.slug ? allMessages[roomId.slug] ?? [] : []),
    [allMessages, roomId?.slug],
  );
};
