import { useMemo } from "react";
import { useMatrixStore } from "../store/use-matrix-store";
import { ZionClientEvent } from "../client/ZionClientTypes";

export const useZionClientEvent = (event: ZionClientEvent) => {
  const { zionClientEvents } = useMatrixStore();
  return useMemo(() => zionClientEvents[event] ?? 0, [zionClientEvents, event]);
};
