import debug from 'debug'

import React, { ChangeEvent, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router'
import {
    Channel,
    RoomMember,
    useMyProfile,
    useSpaceMembers,
    useTimelineStore,
} from 'use-zion-client'
import { ThreadStatsMap } from 'use-zion-client/dist/store/use-timeline-store'
import { MessageResultItem } from '@components/MessageResultItem/MessageResultItem'
import { ZRoomMessageEvent } from '@components/MessageTimeline/util/getEventsByDate'
import { ModalContainer } from '@components/Modals/ModalContainer'
import { Box, Icon, Paragraph, Stack, TextField } from '@ui'
import { useSpaceChannels } from 'hooks/useSpaceChannels'
import { useShortcut } from 'hooks/useShortcut'
import { atoms } from 'ui/styles/atoms.css'
import { useMessageIndex } from './hooks/useMessageIndex'
// import { useOramaSearch } from './hooks/useOramaSearch'
import { useMiniSearch } from './hooks/useMiniSearch'

type SearchItem = ReturnType<typeof useMessageIndex>['messages'][0]

const log = debug('app:search')
log.enabled = true

export const SearchModal = () => {
    const [isVisible, setIsVisible] = useState(false)

    const onHide = () => {
        setIsVisible(false)
    }

    useShortcut(
        'DisplaySearchModal',
        () => {
            setIsVisible((t) => !t)
        },
        { enableOnFormTags: true },
    )

    const { messages } = useMessageIndex()

    return isVisible ? <SearchModalContainer messages={messages} onHide={onHide} /> : <></>
}

const SearchModalContainer = (props: { onHide: () => void; messages: SearchItem[] }) => {
    const { messages } = props
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

    const results = useMiniSearch(messages, value)

    useShortcut('DismissDialog', props.onHide, { enableOnFormTags: true })

    const location = useLocation()
    const initialLocation = useRef(`${location.pathname}#${location.hash}`)

    useEffect(() => {
        if (`${location.pathname}#${location.hash}` !== initialLocation.current) {
            props.onHide()
        }
    }, [location.hash, location.pathname, props])

    const miscProps = useMemo(
        () => ({ channels, members, threadsStats }),
        [channels, members, threadsStats],
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
                            results.map((item) => (
                                <ResultItem
                                    key={item.key}
                                    event={item.source}
                                    channelId={item.channelId}
                                    highligtTerms={item.terms}
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
    event: ZRoomMessageEvent
    channelId: string
    highligtTerms?: string[]
    misc: { members: RoomMember[]; channels: Channel[]; threadsStats: ThreadStatsMap }
}) => {
    const userId = useMyProfile()?.userId
    const { event, channelId, misc } = props
    const { threadsStats, channels } = misc

    const channel = channels.find((c) => c.id.networkId === channelId)

    if (!channel) {
        return <></>
    }

    const threadStat = event.threadParentId
        ? threadsStats[channel.id.networkId]?.[event.threadParentId]
        : undefined

    return (
        <MessageResultItem
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
