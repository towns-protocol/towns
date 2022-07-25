import { useMemo } from "react";
import { powerLevelDefinitions } from "../data/power-level-definitions";
import { useMatrixStore } from "../store/use-matrix-store";
import {
  PowerLevel,
  PowerLevelDefinition,
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

export function enrichPowerLevels(
  levels: Record<string, unknown> | undefined,
): PowerLevels {
  const userPowers = levels ? (levels["users"] as Record<string, number>) : {};
  const roomLevels = powerLevelDefinitions.map((def) =>
    toPowerLevel(levels, def),
  );
  return {
    userPowers: userPowers,
    levels: roomLevels,
  };
}

function toPowerLevel(
  levels: Record<string, unknown> | undefined,
  def: PowerLevelDefinition,
): PowerLevel {
  return {
    value: getRoomPowerLevelValue(levels, def),
    definition: def,
  };
}

function getRoomPowerLevelValue(
  levels: Record<string, unknown> | undefined,
  def: PowerLevelDefinition,
): number {
  if (!levels) {
    return def.default;
  }
  const key = def.key;
  if (def.parent) {
    // some of the power levels are nested in the matrix datastructure, so we need a lookup
    return (
      ((levels[def.parent] as Record<string, unknown>)[key] as number) ??
      def.default
    );
  } else if (levels[key]) {
    return (levels[key] as number) ?? def.default;
  }
  return def.default;
}
