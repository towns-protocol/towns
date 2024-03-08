import { useTownsContext } from '../components/TownsContextProvider'

export function useSpaceNotificationCounts(spaceId: string): {
    isUnread: boolean
    mentions: number
} {
    const { spaceUnreads, spaceMentions } = useTownsContext() // aellis 11.2022 this should come out of the context
    const isUnread = spaceUnreads[spaceId] ?? false
    const mentions = spaceMentions[spaceId] ?? 0
    return {
        isUnread,
        mentions: mentions,
    }
}
