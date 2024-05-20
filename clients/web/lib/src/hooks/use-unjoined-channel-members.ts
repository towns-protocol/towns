import { useTownsContext } from '../components/TownsContextProvider'

const CACHE_PREFIX = 'unjoined-channel-members'
const CACHE_EXPIRY_MS = 1 * 60 * 1000

/**
 * Returns function to get members from unjoined rooms and caches the results
 */
export function useUnjoinedChannelMembers() {
    const { casablancaClient } = useTownsContext()

    async function getUnjoinedChannelMembers(roomId: string) {
        // if cache is older than 1 minute, invalidate it
        const cacheKeyTimestamp = `${CACHE_PREFIX}/roomId/${roomId}/timestamp`
        const cachedTimestamp = sessionStorage.getItem(cacheKeyTimestamp)
        if (cachedTimestamp) {
            const timestamp = parseInt(cachedTimestamp, 10)
            if (Date.now() - timestamp > CACHE_EXPIRY_MS) {
                sessionStorage.removeItem(`${CACHE_PREFIX}/roomId/${roomId}`)
            }
        }

        const cacheKey = `${CACHE_PREFIX}/roomId/${roomId}`
        const cachedData = sessionStorage.getItem(cacheKey)
        if (cachedData) {
            return JSON.parse(cachedData) as string[]
        }

        const memberIdsArray = await fetchStreamMembers(roomId)
        sessionStorage.setItem(cacheKey, JSON.stringify(memberIdsArray))
        sessionStorage.setItem(cacheKeyTimestamp, Date.now().toString())
        return memberIdsArray
    }

    const fetchStreamMembers = async (roomId: string) => {
        const stream = await casablancaClient?.getStream(roomId)
        const memberIdsArray = Array.from(
            stream?.getMembers().membership.joinedUsers.values() ?? [],
        )
        return memberIdsArray
    }

    return getUnjoinedChannelMembers
}
