import { env } from './environment'

const addressFromSpaceId = (spaceId: string | undefined) => {
    return spaceId ? '0x' + spaceId.slice(2, 42) : undefined
}

/**
 * Checks if a town is banned
 * @param identifier The town identifier (can be address, spaceId, or slug)
 * @returns True if the town is banned, false otherwise
 */
export const isTownBanned = (identifier: string): boolean => {
    if (!env.VITE_BANNED_TOWNS) {
        return false
    }

    let townAddress = identifier
    if (identifier && !identifier.startsWith('0x')) {
        const convertedAddress = addressFromSpaceId(identifier)
        if (convertedAddress) {
            townAddress = convertedAddress
        }
    }

    const bannedTowns = env.VITE_BANNED_TOWNS.split(',').map((addr) => addr.trim().toLowerCase())

    return bannedTowns.includes(townAddress.toLowerCase())
}
