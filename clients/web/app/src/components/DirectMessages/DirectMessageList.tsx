import React, {
    ChangeEvent,
    useCallback,
    useDeferredValue,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react'
import { useLocation, useMatch, useNavigate } from 'react-router'
import { DMChannelIdentifier, useTimelineStore, useZionContext } from 'use-zion-client'
import { DMChannelContextUserLookupProvider } from 'use-zion-client/dist/components/UserLookupContext'
import { ResultItem } from '@components/SearchBar/SearchResultItem'
import { Box, Icon, IconButton, Paragraph, Stack, TextField } from '@ui'
import { useCreateLink } from 'hooks/useCreateLink'
import { useDmChannels } from 'hooks/useDMChannels'
import { useDevice } from 'hooks/useDevice'
import { useSearch } from 'hooks/useSearch'
import { notUndefined } from 'ui/utils/utils'
import { SearchContext } from '@components/SearchContext/SearchContext'
import { DirectMessageListItem } from './DirectMessageListItem'

export const DirectMessageList = () => {
    const { channels: dmChannelIds } = useFilteredDirectMessages()

    const routeMatch = useMatch('messages/:channelId/*')

    const channelId = routeMatch?.params.channelId
    const hashId = useLocation().hash.replace('#', '')

    const { dmUnreadChannelIds } = useZionContext()

    const { selectMessage } = useSelectMessage(dmChannelIds, channelId)

    const [searchValue, setSearchValue] = useState('')

    const onSearch = useCallback((value: string) => {
        setSearchValue(value)
    }, [])

    const searchResults = useSearch(searchValue).searchResults.filter(
        (r) => r.item.type === 'dmMessage',
    )

    const { threadsStats } = useTimelineStore(({ threadsStats }) => ({
        threadsStats,
    }))

    const channels = searchResults.length
        ? searchResults
              .filter((r) => r.item.type === 'dmMessage')
              .map((r) => {
                  return dmChannelIds.find(
                      (c) => r.item.type === 'dmMessage' && c.id.slug === r.item.channelId,
                  )
              })
              .filter(notUndefined)
        : dmChannelIds

    const dmChannels = useDmChannels()

    const miscProps = useMemo(
        () => ({ channels: [...dmChannels], members: [], threadsStats, spaceId: undefined }),
        [dmChannels, threadsStats],
    )

    return (
        <Stack scroll padding="sm">
            <Stack minHeight="100svh" paddingBottom="safeAreaInsetBottom" gap="xxs">
                {channels.length > 0 && <SearchField onSearchValue={onSearch} />}

                {searchResults.length > 0 ? (
                    <SearchContext.Provider value="messages">
                        {searchResults.map((s, index, items) => (
                            <DMChannelContextUserLookupProvider
                                fallbackToParentContext
                                key={s.item.key}
                                channelId={
                                    s.item.type === 'dmMessage' ? s.item.channelId : undefined
                                }
                            >
                                <ResultItem
                                    key={s.item.key}
                                    result={s}
                                    misc={miscProps}
                                    paddingY="sm"
                                    paddingX="sm"
                                    rounded="sm"
                                    background={
                                        s.item.type === 'dmMessage' && hashId === s.item.key
                                            ? 'level2'
                                            : 'level1'
                                    }
                                />
                            </DMChannelContextUserLookupProvider>
                        ))}
                    </SearchContext.Provider>
                ) : channels.length > 0 ? (
                    channels.map((channel) => {
                        return (
                            <DMChannelContextUserLookupProvider
                                fallbackToParentContext
                                key={channel.id.networkId}
                                channelId={channel.id.networkId}
                            >
                                <DirectMessageListItem
                                    key={channel.id.networkId}
                                    channel={channel}
                                    selected={channelId === channel.id.slug}
                                    unread={dmUnreadChannelIds.has(channel.id.slug)}
                                    onSelect={selectMessage}
                                />
                            </DMChannelContextUserLookupProvider>
                        )
                    })
                ) : (
                    <Box centerContent absoluteFill padding="md" pointerEvents="none">
                        <Paragraph as="span" color="gray2" textAlign="center">
                            Click the compose button above{' '}
                            <Box
                                display="inline-block"
                                style={{ verticalAlign: 'middle' }}
                                paddingBottom="xxs"
                            >
                                <Icon type="compose" size="square_sm" />
                            </Box>
                            <br />
                            to write your first message
                        </Paragraph>
                    </Box>
                )}
            </Stack>
        </Stack>
    )
}

const SearchField = (props: { onSearchValue: (value: string) => void }) => {
    const { onSearchValue } = props

    const [value, setValue] = useState('')

    const onChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target) {
            setValue(e.target.value)
        }
    }

    const onClearSearch = useCallback(() => {
        setValue('')
    }, [])

    const deferredValue = useDeferredValue(value)

    useEffect(() => {
        onSearchValue(deferredValue)
    }, [deferredValue, onSearchValue])

    return (
        <Stack horizontal>
            <Box horizontal grow padding="sm" height="x8" shrink={false}>
                <TextField
                    tone="none"
                    background="level2"
                    height="100%"
                    placeholder="Search DMs"
                    value={value ?? undefined}
                    onKeyDown={(e) => e.key === 'Escape' && onClearSearch()}
                    onChange={onChange}
                />
            </Box>
            {!!value && (
                <Box centerContent>
                    <IconButton
                        padding="sm"
                        size="square_sm"
                        color="gray2"
                        icon="close"
                        onClick={onClearSearch}
                    />
                </Box>
            )}
        </Stack>
    )
}

const useFilteredDirectMessages = () => {
    const { dmChannels: _dmChannels } = useZionContext()
    const channels = useMemo(() => _dmChannels.filter((c) => !c.left), [_dmChannels])
    return { channels }
}

const useSelectMessage = (dmChannels: DMChannelIdentifier[], messageId?: string) => {
    const { isTouch } = useDevice()
    const navigate = useNavigate()
    const hasInitRef = useRef(false)
    const { createLink } = useCreateLink()

    // auto select first message if needed
    useEffect(() => {
        if (!hasInitRef.current && !isTouch && !messageId && dmChannels.length > 0) {
            const link = createLink({ messageId: dmChannels[0].id.slug })
            if (link) {
                navigate(link)
            }
        }
        hasInitRef.current = true
    }, [messageId, dmChannels, navigate, isTouch, createLink])

    const selectMessage = useCallback(
        (id: string) => {
            const link = createLink({ messageId: id })
            if (link) {
                navigate(link)
            }
        },
        [createLink, navigate],
    )

    return { selectMessage }
}
