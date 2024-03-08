import { useCallback, useMemo } from 'react'
import { firstBy } from 'thenby'
import { LookupUser, useUserLookupContext } from 'use-towns-client'
import {
    ActionEventDocument,
    ChannelEventDocument,
    DmChannelEventDocument,
    UserEventDocument,
    isCombinedResultItem,
} from '@components/SearchBar/types'
import { useIndexMessages } from 'hooks/useIndexMessages'
import { useStore } from 'store/store'
import { useMiniSearch } from './useMiniSearch'
import { useSortedChannels } from './useSortedChannels'
// import { useOramaSearch } from './hooks/useOramaSearch'

export const useSearch = (searchTerms: string) => {
    const { users } = useUserLookupContext()
    const { messages: indexedMessages, dmMessages: indexedDMMessages } = useIndexMessages()

    const { channelItems, dmItems } = useSortedChannels({ spaceId: '' })

    const indexedChannels = useMemo<ChannelEventDocument[]>(
        () =>
            channelItems.map((c) => ({
                key: `channel-${c.id}`,
                type: 'channel' as const,
                body: c.label + c.search,
                source: {
                    ...c,
                    isJoined: true,
                    muted: false,
                },
            })),
        [channelItems],
    )
    const indexedDmChannels = useMemo<DmChannelEventDocument[]>(
        () =>
            dmItems
                .filter((c) => c.isGroup)
                .map((c) => ({
                    key: `dm-channel-${c.id}`,
                    type: 'dmChannel' as const,
                    body: c.label + c.search,
                    source: {
                        ...c,
                    },
                })),
        [dmItems],
    )

    const indexedMembers = useMemo<UserEventDocument[]>(
        () =>
            users.map((u: LookupUser) => ({
                key: `user-${u.userId}`,
                type: 'user' as const,
                body: lookupUserNameSearchString(u),
                source: u,
            })),
        [users],
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
                body: 'Report Bug, Feedback, Error, Issue',
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
            ...indexedDmChannels,
            ...indexedMessages,
            ...indexedDMMessages,
            ...indexedActions,
        ],
        [
            indexedMembers,
            indexedChannels,
            indexedDmChannels,
            indexedMessages,
            indexedDMMessages,
            indexedActions,
        ],
    )

    const order = ['user', 'dmChannel', 'channel', 'dmMessage', 'message']

    const searchResults = useMiniSearch(searchItems, searchTerms)
        .map((r) => ({ searchResult: r, item: searchItems.find((i) => i.key === r.id) }))
        .filter(isCombinedResultItem)
        .slice(0, 50)
        .sort(firstBy((r) => order.indexOf(r.item.type)))

    return { searchResults }
}

export function lookupUserNameSearchString(user: LookupUser) {
    // Users may have different names in different spaces, and we want to search all of them.
    // The easiest way is to just concatenate all the names into a single string.
    return Object.values(user.memberOf ?? {})
        .flatMap((info) => [info.displayName, info.username])
        .join(' ')
        .trim()
}
