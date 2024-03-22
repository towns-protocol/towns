// like Chatmessages, but for any timelines
// snapshot
// messages...
// load more, filter, etc

import { Box, Divider, Theme, Typography } from '@mui/material'
import {
    TimelineEvent,
    ZTEvent,
    toRoomIdentifier,
    useTimeline,
    useTimelineFilter,
    useTownsClient,
    useTownsContext,
} from 'use-towns-client'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { cloneAndFormat } from '@river/dlog'

interface Props {
    streamId: string
}

export function StreamView(props: Props): JSX.Element {
    const streamId = toRoomIdentifier(props.streamId)
    const { casablancaClient } = useTownsContext()
    const { scrollback } = useTownsClient()
    const stream = streamId ? casablancaClient?.stream(streamId) : undefined
    const snapshot = useMemo(() => stream?.view.snapshot, [stream?.view.snapshot])
    const [hasReachedTerminus, setHasReachedTerminus] = useState<boolean>(false)
    const [scrollToBottom, setScrollToBottom] = useState<boolean>(true)
    const { timeline } = useTimeline(streamId)
    const canLoadMore =
        timeline.length === 0 ||
        (timeline[0].content?.kind !== ZTEvent.RoomCreate && !hasReachedTerminus)
    const messagesEndRef = useRef<HTMLDivElement>(null)
    const messagesStartRef = useRef<HTMLDivElement>(null)
    const isLoadingMore = useRef<boolean>(false)
    const { eventFilter, filterEvent } = useTimelineFilter()
    const eventFilterToggles = useMemo(() => {
        const toggles = []
        for (const e of eventFilter ?? []) {
            toggles.push({ name: e, type: e })
        }
        for (const event of timeline) {
            if (event.content?.kind && !toggles.find((x) => x.type === event.content?.kind)) {
                toggles.push({ name: event.content.kind, type: event.content.kind })
            }
        }
        return toggles
    }, [eventFilter, timeline])

    // scroll to bottom effect
    useEffect(() => {
        if (scrollToBottom && messagesEndRef.current && timeline.length > 0) {
            messagesEndRef.current.scrollIntoView({ behavior: 'instant' })
        }
    }, [scrollToBottom, timeline])

    const onClickLoadMore = useCallback(() => {
        if (isLoadingMore.current || !streamId) {
            return
        }
        isLoadingMore.current = true
        setScrollToBottom(false)
        ;(async () => {
            try {
                const result = await scrollback(streamId)
                if (result?.terminus) {
                    setHasReachedTerminus(true)
                }
                if (messagesStartRef.current) {
                    messagesStartRef.current.scrollIntoView({ behavior: 'instant' })
                }
            } finally {
                isLoadingMore.current = false
            }
        })()
    }, [scrollback, streamId])

    const chatMessages = () => {
        if (timeline.length > 0) {
            return (
                <>
                    {timeline.map((m: TimelineEvent, index: number) => (
                        <TimelineMessage event={m} key={m.eventId} />
                    ))}
                </>
            )
        } else {
            return <NoEvents />
        }
    }

    return (
        <Box display="flex" flexGrow="1" flexDirection="column" height="80vh">
            <Box>
                <label>Events:</label>
            </Box>
            <Box overflow="auto" flexGrow="1" minHeight={400}>
                <div ref={messagesStartRef} />
                {chatMessages()}
                <div ref={messagesEndRef} />
            </Box>
            <Box display="flex" flexDirection="row" flexGrow={1} />

            <Divider />

            <Box>
                <CheckyBox
                    label="Scroll To Bottom"
                    checked={scrollToBottom}
                    onChange={() => setScrollToBottom(!scrollToBottom)}
                />
            </Box>
            <Box>
                <label>Filters:</label>
                {eventFilterToggles.map((f) => (
                    <CheckyBox
                        key={f.name}
                        label={f.name}
                        checked={!eventFilter || !eventFilter.has(f.type)}
                        onChange={() =>
                            filterEvent(f.type, !eventFilter || !eventFilter.has(f.type))
                        }
                    />
                ))}
            </Box>
            <Box>
                {canLoadMore && (
                    <Typography
                        key="can-load-more"
                        display="block"
                        variant="body1"
                        component="button"
                        sx={buttonStyle}
                        onClick={onClickLoadMore}
                    >
                        Load More
                    </Typography>
                )}
            </Box>
            <Box>
                <label>Snapshot:</label>
            </Box>
            <Box>
                <JsonDisplay
                    data={
                        snapshot
                            ? JSON.stringify(
                                  cloneAndFormat(snapshot, { shortenHex: false }),
                                  undefined,
                                  2,
                              )
                            : 'NO SNAPSHOT?'
                    }
                />
            </Box>
        </Box>
    )
}

const CheckyBox = (props: { label: string; checked: boolean; onChange: () => void }) => (
    <>
        <input
            key={props.label}
            type="checkbox"
            name={props.label}
            checked={props.checked}
            onChange={props.onChange}
        />
        <label>{props.label}</label>
    </>
)

const NoEvents = () => (
    <Typography display="block" variant="body1" component="span" sx={messageStyle}>
        There are no events.
    </Typography>
)

function TimelineMessage(props: { event: TimelineEvent }) {
    const { event } = props
    const date = new Date(event.createdAtEpochMs)
    return (
        <Typography display="block" variant="body1" component="span" sx={messageStyle}>
            <p style={dateStyle}>
                {date.toLocaleString()} ({truncateEventId(event.eventId)})
            </p>
            {formatEvent(event)}
        </Typography>
    )
}

function JsonDisplay({ data }: { data: string }) {
    return (
        <Box
            sx={{
                overflowX: 'auto',
                backgroundColor: 'background.paper',
                border: '1px solid',
                borderColor: 'divider',
                p: 2,
                borderRadius: 1,
                fontFamily: 'monospace',
            }}
        >
            <Typography component="pre">
                {/* <code>{JSON.stringify(data, null, 2)}</code> */}
                <code>{data}</code>
            </Typography>
        </Box>
    )
}

export default JsonDisplay

function formatEvent(event: TimelineEvent): string {
    switch (event.content?.kind) {
        case ZTEvent.RoomMessage:
            return `${event.sender.displayName}: ${event.content.body}`
        default:
            return event.fallbackContent
    }
}

function truncateEventId(text: string) {
    if (text.length < 10) {
        return text
    }
    const startChars = 6
    const endChars = 6
    const mid = '...'
    const start = text.substring(0, startChars)
    const end = text.substring(text.length - endChars, text.length)
    return start + mid + end
}

const messageStyle = {
    padding: (theme: Theme) => theme.spacing(1),
    gap: (theme: Theme) => theme.spacing(1),
}

const buttonStyle = {
    padding: (theme: Theme) => theme.spacing(0),
    gap: (theme: Theme) => theme.spacing(0),
}

const smallStyle = {
    color: 'gray',
    fontSize: '14px',
    paddingBottom: '0px',
    marginBottom: '5px',
}

const dateStyle = smallStyle
