import { useZionContext } from '../components/ZionContextProvider'

export function useSpaceNotificationCounts(spaceId: string): {
    isUnread: boolean
    mentions: number
} {
    const { spaceUnreads, spaceMentions } = useZionContext() // aellis 11.2022 this should come out of the context
    const isUnread = spaceUnreads[spaceId] ?? false
    const mentions = spaceMentions[spaceId] ?? 0
    return {
        isUnread,
        mentions: mentions,
    }
}
