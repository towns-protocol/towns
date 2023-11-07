import { useMemo } from 'react'
import { firstBy } from 'thenby'
import { useSpaceMembers } from 'use-zion-client'
import { useIndexMessages } from 'hooks/useIndexMessages'
import { isCombinedResultItem } from '@components/SearchBar/types'
import { useMiniSearch } from './useMiniSearch'
import { useChannelsWithMentionCountsAndUnread } from './useChannelsWithMentionCountsAndUnread'
// import { useOramaSearch } from './hooks/useOramaSearch'

export const useSearch = (searchTerms: string) => {
    const { members } = useSpaceMembers()
    const { messages: indexedMessages, dmMessages: indexedDMMessages } = useIndexMessages()

    const { channelsWithMentionCountsAndUnread } = useChannelsWithMentionCountsAndUnread()

    const indexedChannels = useMemo(
        () =>
            channelsWithMentionCountsAndUnread.map((c) => ({
                key: `channel-${c.channelNetworkId}`,
                type: 'channel' as const,
                body: c.name,
                source: c,
            })),
        [channelsWithMentionCountsAndUnread],
    )

    const indexedMembers = useMemo(
        () =>
            members.map((m) => ({
                key: `user-${m.userId}`,
                type: 'user' as const,
                body: m.name,
                source: m,
            })),
        [members],
    )

    const searchItems = useMemo(
        () => [...indexedMembers, ...indexedChannels, ...indexedMessages, ...indexedDMMessages],
        [indexedChannels, indexedMessages, indexedMembers, indexedDMMessages],
    )

    const order = ['user', 'channel', 'dmMessage', 'message']

    const searchResults = useMiniSearch(searchItems, searchTerms)
        .map((r) => r)
        .map((r) => ({ searchResult: r, item: searchItems.find((i) => i.key === r.id) }))
        .filter(isCombinedResultItem)
        .sort(firstBy((r) => order.indexOf(r.item.type)))

    return { searchResults }
}
