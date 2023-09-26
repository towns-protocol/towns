import debug from 'debug'

import React, { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import {
    Channel,
    RoomIdentifier,
    RoomMember,
    useMyProfile,
    useSpaceId,
    useSpaceMembers,
    useTimelineStore,
} from 'use-zion-client'
import { ThreadStatsMap } from 'use-zion-client/dist/store/use-timeline-store'

import { Link } from 'react-router-dom'
import { firstBy } from 'thenby'
import { ZRoomMessageEvent } from '@components/MessageTimeline/util/getEventsByDate'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { IsolatedMessageItem } from '@components/ResultItem/IsolatedMessageItem'
import { Avatar, Box, Icon, Paragraph, Stack, TextField } from '@ui'
import { useChannelsWithMentionCountsAndUnread } from 'hooks/useChannelsWithMentionCountsAndUnread'
import { useCreateLink } from 'hooks/useCreateLink'
import { useShortcut } from 'hooks/useShortcut'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { atoms } from 'ui/styles/atoms.css'
import { getPrettyDisplayName } from 'utils/getPrettyDisplayName'
import { useMessageIndex } from './hooks/useMessageIndex'
// import { useOramaSearch } from './hooks/useOramaSearch'
import { useMiniSearch } from './hooks/useMiniSearch'

import { CombinedResult, EventDocument, isCombinedResultItem } from './types'

const log = debug('app:search')
log.enabled = true

export const SearchModal = () => {
    const [isVisible, setIsVisible] = useState(false)

    const onHide = () => {
        setIsVisible(false)
    }

    const { channelsWithMentionCountsAndUnread } = useChannelsWithMentionCountsAndUnread()

    useShortcut(
        'DisplaySearchModal',
        () => {
            setIsVisible((t) => !t)
        },
        { enableOnFormTags: true },
    )

    const { members } = useSpaceMembers()

    const { messages: indexedMessages } = useMessageIndex()

    const indexedChannels = channelsWithMentionCountsAndUnread.map((c) => ({
        key: `channel-${c.channelNetworkId}`,
        type: 'channel' as const,
        body: c.name,
        source: c,
    }))

    const indexedMembers = members.map((m) => ({
        key: `user-${m.userId}`,
        type: 'user' as const,
        body: m.name,
        source: m,
    }))

    const searchedItems = useMemo(
        () => [...indexedMembers, ...indexedChannels, ...indexedMessages],
        [indexedChannels, indexedMessages, indexedMembers],
    )

    return isVisible ? <SearchModalContainer searchItems={searchedItems} onHide={onHide} /> : <></>
}

const SearchModalContainer = (props: { onHide: () => void; searchItems: EventDocument[] }) => {
    const spaceId = useSpaceId()
    const { searchItems } = props
    const { threadsStats } = useTimelineStore(({ threadsStats }) => ({
        threadsStats,
    }))
    const [value, setValue] = useState('')

    const onChange = (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target) {
            setValue(e.target.value)
        }
    }

    const channels = useSpaceChannels()
    const { members } = useSpaceMembers()

    const order = ['user', 'channel', 'message']

    const results = useMiniSearch(searchItems, value)
        .map((r) => r)
        .map((r) => ({ searchResult: r, item: searchItems.find((i) => i.key === r.id) }))
        .filter(isCombinedResultItem)
        .sort(firstBy((r) => order.indexOf(r.item.type)))

    useShortcut('DismissDialog', props.onHide, { enableOnFormTags: true })

    const location = useLocation()
    const initialLocation = useRef(`${location.pathname}#${location.hash}`)

    useEffect(() => {
        if (`${location.pathname}#${location.hash}` !== initialLocation.current) {
            props.onHide()
        }
    }, [location.hash, location.pathname, props])

    const miscProps = useMemo(
        () => ({ channels, members, threadsStats, spaceId }),
        [channels, members, threadsStats, spaceId],
    )

    return (
        <ModalContainer stableTopAlignment onHide={props.onHide}>
            <Stack gap="lg" width="800" maxWidth="100%" maxHeight="100%">
                <Box>
                    <TextField
                        autoFocus
                        background="level2"
                        height="x8"
                        before={<Icon type="search" color="gray2" />}
                        placeholder="Start typing to search ..."
                        value={value ?? undefined}
                        onChange={onChange}
                    />
                </Box>
                {results.length > 0 || value ? (
                    <Stack gap overflow="scroll" maxHeight="500">
                        {results.length === 0 && value ? (
                            <Box centerContent grow color="gray2">
                                <Stack horizontal centerContent gap padding="x4">
                                    <Paragraph>
                                        No matches for{' '}
                                        <span className={atoms({ color: 'default' })}>
                                            &quot;{value}&quot;
                                        </span>
                                    </Paragraph>
                                </Stack>
                            </Box>
                        ) : (
                            results.map((result) => (
                                <ResultItem
                                    key={result.searchResult.id}
                                    result={result}
                                    misc={miscProps}
                                />
                            ))
                        )}
                    </Stack>
                ) : (
                    <></>
                )}
            </Stack>
        </ModalContainer>
    )
}

export const ResultItem = (props: {
    result: CombinedResult
    misc: {
        channels: Channel[]
        members: RoomMember[]
        threadsStats: ThreadStatsMap
        spaceId: RoomIdentifier | undefined
    }
}) => {
    const item = props.result.item
    const { createLink } = useCreateLink()

    switch (item.type) {
        case 'user': {
            const link = createLink({
                profileId: item.source.userId,
            })

            return !link ? null : (
                <Link to={link}>
                    <Box
                        hoverable
                        padding
                        shrink
                        horizontal
                        background="level2"
                        rounded="sm"
                        gap="sm"
                    >
                        <Box minWidth="x8" padding="sm">
                            <Avatar userId={item.source.userId} />
                        </Box>
                        <Box centerContent>
                            <Paragraph strong>{getPrettyDisplayName(item.source).name}</Paragraph>
                        </Box>
                    </Box>
                </Link>
            )
        }

        case 'channel': {
            const link = createLink({
                spaceId: props.misc.spaceId?.networkId,
                channelId: item.source.channelNetworkId,
                panel: 'channelInfo' as const,
            })

            return !link ? null : (
                <Link to={link}>
                    <Box hoverable padding shrink horizontal gap background="level2" rounded="sm">
                        <Box minWidth="x8" padding="sm">
                            <Box
                                centerContent
                                padding="sm"
                                aspectRatio="square"
                                background="level3"
                                borderRadius="sm"
                            >
                                <Icon type="tag" />
                            </Box>
                        </Box>
                        <Box centerContent>
                            <Paragraph>{item.source.name}</Paragraph>
                        </Box>
                    </Box>
                </Link>
            )
        }

        case 'message': {
            return (
                <MessageResultItem
                    event={item.source}
                    channelId={item.channelId}
                    misc={props.misc}
                    highligtTerms={props.result.searchResult.terms}
                />
            )
        }
    }
}

export const MessageResultItem = (props: {
    event: ZRoomMessageEvent
    highligtTerms?: string[]
    channelId: string
    misc: { members: RoomMember[]; channels: Channel[]; threadsStats: ThreadStatsMap }
}) => {
    const userId = useMyProfile()?.userId
    const { event, misc } = props
    const { threadsStats, channels } = misc

    const channel = channels.find((c) => c.id.networkId === props.channelId)

    if (!channel) {
        return <></>
    }

    const threadStat = event.threadParentId
        ? threadsStats[channel.id.networkId]?.[event.threadParentId]
        : undefined

    return (
        <IsolatedMessageItem
            highligtTerms={props.highligtTerms}
            result={{
                type: 'mention',
                unread: false,
                event,
                channel,
                timestamp: event.createdAtEpocMs,
                thread: threadStat?.parentEvent,
            }}
            userId={userId}
        />
    )
}
