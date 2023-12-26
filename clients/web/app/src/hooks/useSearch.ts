import { useMemo } from 'react'
import { firstBy } from 'thenby'
import { useSpaceMembers, useUserLookupContext } from 'use-zion-client'
import { useIndexMessages } from 'hooks/useIndexMessages'
import { isCombinedResultItem } from '@components/SearchBar/types'
import { useMiniSearch } from './useMiniSearch'
import { useChannelsWithMentionCountsAndUnread } from './useChannelsWithMentionCountsAndUnread'
// import { useOramaSearch } from './hooks/useOramaSearch'

export const useSearch = (searchTerms: string) => {
    const { memberIds } = useSpaceMembers()
    const { usersMap } = useUserLookupContext()
    const { messages: indexedMessages, dmMessages: indexedDMMessages } = useIndexMessages()

    const { channelsWithMentionCountsAndUnread } = useChannelsWithMentionCountsAndUnread()

    const indexedChannels = useMemo(
        () =>
            channelsWithMentionCountsAndUnread.map((c) => ({
                key: `channel-${c.id}`,
                type: 'channel' as const,
                body: c.label,
                source: c,
            })),
        [channelsWithMentionCountsAndUnread],
    )

    const indexedMembers = useMemo(
        () =>
            memberIds
                .filter((userId) => usersMap[userId])
                .map((userId: string) => ({
                    key: `user-${userId}`,
                    type: 'user' as const,
                    body: usersMap[userId]?.displayName,
                    source: usersMap[userId],
                })),
        [memberIds, usersMap],
    )

    const searchItems = useMemo(
        () => [...indexedMembers, ...indexedChannels, ...indexedMessages, ...indexedDMMessages],
        [indexedChannels, indexedMessages, indexedMembers, indexedDMMessages],
    )

    const order = ['user', 'channel', 'dmMessage', 'message']

    const searchResults = useMiniSearch(searchItems, searchTerms)
        .map((r) => ({ searchResult: r, item: searchItems.find((i) => i.key === r.id) }))
        .filter(isCombinedResultItem)
        .sort(firstBy((r) => order.indexOf(r.item.type)))

    return { searchResults }
}
