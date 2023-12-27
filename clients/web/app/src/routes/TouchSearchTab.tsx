import React, { useCallback, useMemo } from 'react'
import {
    useSpaceData,
    useSpaceId,
    useTimelineStore,
    useUserLookupContext,
    useZionContext,
} from 'use-zion-client'
import { ResultItem } from '@components/SearchBar/SearchResultItem'
import { TouchScrollToTopScrollId } from '@components/TouchTabBar/TouchScrollToTopScrollId'
import { Box, Icon, IconButton, Paragraph, Stack, TextField } from '@ui'
import { useSearch } from 'hooks/useSearch'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { useStore } from 'store/store'
import { atoms } from 'ui/styles/atoms.css'
import { useDmChannels } from 'hooks/useDMChannels'
import { CentralPanelLayout } from './layouts/CentralPanelLayout'

const sectionTypeNameMap = {
    user: 'Persons',
    message: 'Messages',
    channel: 'Channels',
    dmMessage: 'Direct Messages',
} as const

export const getSectionTitle = (type: 'user' | 'message' | 'channel' | 'dmMessage') =>
    sectionTypeNameMap[type]

export const TouchSearchTab = () => {
    const { setSearchTerms, searchTerms } = useStore(({ setSearchTerms, searchTerms }) => ({
        setSearchTerms,
        searchTerms,
    }))

    const { searchResults } = useSearch(searchTerms)

    const onChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            setSearchTerms(event.target.value)
        },
        [setSearchTerms],
    )

    const onClearSearch = useCallback(() => {
        setSearchTerms('')
    }, [setSearchTerms])

    const [isFieldFocused, setIsFieldFocused] = React.useState(false)

    const onFieldFocus = useCallback(() => {
        setIsFieldFocused(true)
    }, [])
    const onFieldBlur = useCallback(() => {
        setIsFieldFocused(false)
    }, [])

    const spaceId = useSpaceId()
    const channels = useSpaceChannels()
    const dmChannels = useDmChannels()
    const { dmChannels: dmChannelIds } = useZionContext()

    const { users: members } = useUserLookupContext()

    const { threadsStats } = useTimelineStore(({ threadsStats }) => ({
        threadsStats,
    }))

    const miscProps = useMemo(
        () => ({
            channels: [...channels, ...dmChannels],
            dmChannelIds,
            members,
            threadsStats,
            spaceId,
        }),
        [channels, dmChannels, dmChannelIds, members, spaceId, threadsStats],
    )
    const onScroll = useCallback(() => {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur()
        }
    }, [])

    const townName = useSpaceData()?.name ?? 'Town'
    const searchLabel = `Search ${townName}`

    const onSearchClick = useCallback(() => {
        const searchInput = document.getElementById(TouchScrollToTopScrollId.SearchTabInputId)
        if (searchInput) {
            searchInput.focus()
        }
    }, [])

    const onKeyPress = useCallback((event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key === 'Enter') {
            if (document.activeElement instanceof HTMLElement) {
                document.activeElement.blur()
            }
        }
    }, [])

    return (
        <CentralPanelLayout>
            <Box grow paddingTop="safeAreaInsetTop" overflow="hidden">
                <Stack horizontal paddingX alignItems="center" paddingY="xs" gap="sm">
                    <TextField
                        autoFocus
                        id={TouchScrollToTopScrollId.SearchTabInputId}
                        type="search"
                        placeholder={searchLabel}
                        height="x5"
                        background="level2"
                        value={searchTerms}
                        onChange={onChange}
                        onFocus={onFieldFocus}
                        onBlur={onFieldBlur}
                        onKeyDown={onKeyPress}
                    />
                    {!!searchTerms && <IconButton icon="close" onClick={onClearSearch} />}
                </Stack>

                <Stack
                    grow
                    padding
                    position="relative"
                    pointerEvents={isFieldFocused ? 'none' : 'all'}
                    height="100%"
                >
                    <Box
                        absoluteFill
                        scroll
                        id={TouchScrollToTopScrollId.SearchTabScrollId}
                        gap="sm"
                        paddingY="md"
                        onScroll={onScroll}
                    >
                        {searchResults.length === 0 ? (
                            <Box alignItems="center" paddingTop="x8" onClick={onSearchClick}>
                                <NoResults searchTerms={searchTerms} />
                            </Box>
                        ) : (
                            searchResults.map((s, index, items) => {
                                const result = (
                                    <ResultItem
                                        result={s}
                                        key={s.item.key}
                                        misc={miscProps}
                                        background="level1"
                                    />
                                )
                                const prevItemType = items[index - 1]?.item.type
                                if (s.item.type !== prevItemType) {
                                    return (
                                        <>
                                            <Box paddingX="md" paddingY="sm" key={s.item.type}>
                                                <Paragraph size="sm" color="gray2">
                                                    {getSectionTitle(s.item.type)}
                                                </Paragraph>
                                            </Box>
                                            {result}
                                        </>
                                    )
                                } else {
                                    return result
                                }
                            })
                        )}
                    </Box>
                </Stack>
            </Box>
        </CentralPanelLayout>
    )
}

export const NoResults = (props: { searchTerms: string }) => {
    return (
        <Box gap centerContent padding textAlign="center" color="gray2" maxWidth="300">
            <Box padding="md" color="gray2" background="level2" rounded="sm">
                <Icon type="search" size="square_sm" />
            </Box>
            {props.searchTerms.length < 2 ? (
                <Paragraph textAlign="center">
                    You can search for messages, channels and people
                </Paragraph>
            ) : (
                <Paragraph textAlign="center">
                    No results for &quot;
                    <span className={atoms({ color: 'default' })}>{props.searchTerms}</span>
                    &quot;
                </Paragraph>
            )}
        </Box>
    )
}
