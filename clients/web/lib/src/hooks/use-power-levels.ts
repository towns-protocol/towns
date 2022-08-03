import { enrichPowerLevels } from "../client/matrix/PowerLevels";
import { useMemo } from "react";
import { useMatrixStore } from "../store/use-matrix-store";
import {
  RoomIdentifier,
  PowerLevels,
  toRoomIdentifier,
} from "../types/matrix-types";

export const usePowerLevels = (
  slugOrId: RoomIdentifier | string | undefined,
): PowerLevels => {
  const roomId = toRoomIdentifier(slugOrId);
  const { powerLevels } = useMatrixStore();
  const levels = useMemo(
    () => (roomId && powerLevels ? powerLevels[roomId.slug] : undefined),
    [roomId, powerLevels],
  );

  return useMemo(() => {
    return enrichPowerLevels(levels);
  }, [levels]);
};
