import { useCallback, useMemo } from 'react'
import { firstBy } from 'thenby'
import { useSpaceMembers, useUserLookupContext } from 'use-zion-client'
import { useIndexMessages } from 'hooks/useIndexMessages'
import {
    ActionEventDocument,
    ChannelEventDocument,
    UserEventDocument,
    isCombinedResultItem,
} from '@components/SearchBar/types'
import { useStore } from 'store/store'
import { useMiniSearch } from './useMiniSearch'
import { useChannelsWithMentionCountsAndUnread } from './useChannelsWithMentionCountsAndUnread'
// import { useOramaSearch } from './hooks/useOramaSearch'

export const useSearch = (searchTerms: string) => {
    const { memberIds } = useSpaceMembers()
    const { usersMap } = useUserLookupContext()
    const { messages: indexedMessages, dmMessages: indexedDMMessages } = useIndexMessages()

    const { channelsWithMentionCountsAndUnread } = useChannelsWithMentionCountsAndUnread()

    const indexedChannels = useMemo<ChannelEventDocument[]>(
        () =>
            channelsWithMentionCountsAndUnread.map((c) => ({
                key: `channel-${c.id}`,
                type: 'channel' as const,
                body: c.label,
                source: c,
            })),
        [channelsWithMentionCountsAndUnread],
    )

    const indexedMembers = useMemo<UserEventDocument[]>(
        () =>
            memberIds
                .filter((userId) => usersMap[userId])
                .map((userId: string) => ({
                    key: `user-${userId}`,
                    type: 'user' as const,
                    body: `${usersMap[userId]?.displayName ?? ''} + ${
                        usersMap[userId]?.username ?? ''
                    }`.trim(),
                    source: usersMap[userId],
                })),
        [memberIds, usersMap],
    )

    const setSidePanel = useStore((state) => state.setSidePanel)
    const openBugReport = useCallback(() => {
        setSidePanel('bugReport')
    }, [setSidePanel])

    const indexedActions = useMemo<ActionEventDocument[]>(
        () => [
            {
                key: `actionreport`,
                type: 'action' as const,
                body: 'Report Bug, Feedback, Error',
                source: {
                    icon: 'bug',
                    label: 'Report Bug',
                    callback: openBugReport,
                },
            },
        ],
        [openBugReport],
    )

    const searchItems = useMemo(
        () => [
            ...indexedMembers,
            ...indexedChannels,
            ...indexedMessages,
            ...indexedDMMessages,
            ...indexedActions,
        ],
        [indexedMembers, indexedChannels, indexedMessages, indexedDMMessages, indexedActions],
    )

    const order = ['user', 'channel', 'dmMessage', 'message']

    const searchResults = useMiniSearch(searchItems, searchTerms)
        .map((r) => ({ searchResult: r, item: searchItems.find((i) => i.key === r.id) }))
        .filter(isCombinedResultItem)
        .sort(firstBy((r) => order.indexOf(r.item.type)))

    return { searchResults }
}
