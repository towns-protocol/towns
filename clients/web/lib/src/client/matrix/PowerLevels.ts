import { powerLevelDefinitions } from '../../data/power-level-definitions'
import { PowerLevel, PowerLevelDefinition, PowerLevels } from '../../types/matrix-types'

export function enrichPowerLevels(levels?: Record<string, unknown>): PowerLevels {
    const userPowers = levels ? (levels['users'] as Record<string, number>) : {}
    const roomLevels = powerLevelDefinitions.map((def) => toPowerLevel(levels, def))
    return {
        userPowers: userPowers,
        levels: roomLevels,
    }
}

function toPowerLevel(
    levels: Record<string, unknown> | undefined,
    def: PowerLevelDefinition,
): PowerLevel {
    return {
        value: getRoomPowerLevelValue(levels, def),
        definition: def,
    }
}

function getRoomPowerLevelValue(
    levels: Record<string, unknown> | undefined,
    def: PowerLevelDefinition,
): number {
    if (!levels) {
        return def.default
    }
    const key = def.key
    if (def.parent && levels[def.parent]) {
        // some of the power levels are nested in the matrix datastructure, so we need a lookup
        return ((levels[def.parent] as Record<string, unknown>)[key] as number) ?? def.default
    } else if (levels[key]) {
        return (levels[key] as number) ?? def.default
    }
    return def.default
}
