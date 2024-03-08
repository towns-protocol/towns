import { Box, Button, Divider, TextField, Theme, Typography } from '@mui/material'
import {
    Membership,
    TimelineEvent,
    ZTEvent,
    useFullyReadMarker,
    useTimelineFilter,
    useTownsClient,
} from 'use-towns-client'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AcceptInvitation } from './AcceptInvitation'

interface Props {
    roomId: string
    threadParentId?: string
    timeline: TimelineEvent[]
    membership: string
    sendMessage?: (roomId: string, message: string) => Promise<void>
    joinRoom: (roomId: string) => Promise<void>
}

export function ChatMessages(props: Props): JSX.Element {
    const { timeline, membership, roomId, threadParentId, sendMessage, joinRoom } = props
    const { sendReadReceipt, scrollback } = useTownsClient()
    const unreadMarker = useFullyReadMarker(roomId, threadParentId)
    const [currentMessage, setCurrentMessage] = useState<string>('')
    const hasUnread = membership === Membership.Join && unreadMarker?.isUnread === true
    const [hasReachedTerminus, setHasReachedTerminus] = useState<boolean>(false)
    const [autoPost, setAutoPost] = useState<boolean>(false)
    const [extremeMode, setExtremeMode] = useState<boolean>(false)
    const [scrollToBottom, setScrollToBottom] = useState<boolean>(true)
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
        return toggles.sort((a, b) => a.name.localeCompare(b.name))
    }, [eventFilter, timeline])

    // auto post effect
    useEffect(() => {
        const onInterval = () => {
            if (autoPost) {
                void sendMessage?.(roomId, `¿🌝 GM 🌚?`)
            }
        }
        const intervalId = setInterval(onInterval, extremeMode ? 1 : 1000)
        return () => {
            clearInterval(intervalId)
        }
    }, [autoPost, extremeMode, roomId, sendMessage])

    // scroll to bottom effect
    useEffect(() => {
        if (scrollToBottom && messagesEndRef.current && timeline.length > 0) {
            messagesEndRef.current.scrollIntoView({ behavior: 'instant' })
        }
    }, [scrollToBottom, timeline])

    const onTextChanged = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        setCurrentMessage(event.target.value)
    }, [])

    const onKeyDown = useCallback(
        async (event: React.KeyboardEvent<HTMLInputElement>) => {
            if (event.key === 'Enter' && currentMessage) {
                await sendMessage?.(roomId, currentMessage)
                setCurrentMessage('')
            }
        },
        [currentMessage, roomId, sendMessage],
    )

    const onClickLoadMore = useCallback(() => {
        if (isLoadingMore.current) {
            return
        }
        isLoadingMore.current = true
        setScrollToBottom(false)
        ;(async () => {
            try {
                const result = await scrollback(roomId)
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
    }, [scrollback, roomId])

    const onClickMarkAsRead = useCallback(() => {
        if (!unreadMarker) {
            throw new Error('No unread marker')
        }
        void sendReadReceipt(unreadMarker)
    }, [sendReadReceipt, unreadMarker])

    const onJoinRoom = useCallback(() => {
        joinRoom(roomId)
    }, [joinRoom, roomId])

    const chatMessages = () => {
        if (membership === Membership.Invite) {
            return <AcceptInvitation roomId={roomId} joinRoom={joinRoom} />
        } else if (membership === Membership.Join) {
            if (timeline.length > 0) {
                return (
                    <>
                        {timeline.map((m: TimelineEvent, index: number) => (
                            <ChatMessage event={m} key={m.eventId} />
                        ))}
                    </>
                )
            } else {
                return <NoMessages />
            }
        } else {
            return <MissingMembershipInfo onJoinRoom={onJoinRoom} />
        }
    }

    return (
        <Box display="flex" flexGrow="1" flexDirection="column" height="80vh">
            <Box overflow="auto" flexGrow="1">
                <div ref={messagesStartRef} />
                {chatMessages()}
                <div ref={messagesEndRef} />
            </Box>
            <Box display="flex" flexDirection="row" flexGrow={1} />
            {membership === Membership.Join ? (
                <>
                    <Divider />
                    {sendMessage !== undefined ? (
                        <>
                            <Box sx={messageStyle}>
                                <TextField
                                    fullWidth
                                    id="filled-basic"
                                    label="Type message here"
                                    variant="filled"
                                    value={currentMessage}
                                    onChange={onTextChanged}
                                    onKeyDown={onKeyDown}
                                />
                            </Box>
                            <Box>
                                <CheckyBox
                                    label="Auto Post"
                                    checked={autoPost}
                                    onChange={() => setAutoPost(!autoPost)}
                                />
                                <CheckyBox
                                    label="Extreme Mode"
                                    checked={extremeMode}
                                    onChange={() => setExtremeMode(!extremeMode)}
                                />
                            </Box>
                        </>
                    ) : null}
                    <Box>
                        <CheckyBox
                            label="Scroll To Bottom"
                            checked={scrollToBottom}
                            onChange={() => setScrollToBottom(!scrollToBottom)}
                        />
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
                        {hasUnread && (
                            <>
                                <p style={{ ...smallStyle, alignSelf: 'center' }}>
                                    Unread Event: {truncateEventId(unreadMarker?.eventId ?? '')}
                                </p>
                                <Typography
                                    key="mark-as-read"
                                    display="block"
                                    variant="body1"
                                    component="button"
                                    sx={buttonStyle}
                                    onClick={onClickMarkAsRead}
                                >
                                    Mark as Read
                                </Typography>
                            </>
                        )}
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
                </>
            ) : null}
        </Box>
    )
}

export const CheckyBox = (props: { label: string; checked: boolean; onChange: () => void }) => (
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

const NoMessages = () => (
    <Typography display="block" variant="body1" component="span" sx={messageStyle}>
        There are no messages.
    </Typography>
)

const MissingMembershipInfo = (props: { onJoinRoom: () => void }) => (
    <>
        <Typography display="block" variant="body1" component="span" sx={messageStyle}>
            We don&apos;t have membership information for this room
        </Typography>
        <Button variant="contained" onClick={props.onJoinRoom}>
            Join Room
        </Button>
    </>
)

function ChatMessage(props: { event: TimelineEvent }) {
    const { event } = props
    const date = new Date(event.createdAtEpocMs)
    return (
        <Typography display="block" variant="body1" component="span" sx={messageStyle}>
            <p style={dateStyle}>
                {date.toLocaleString()} ({truncateEventId(event.eventId)})
            </p>
            {formatEvent(event)}
        </Typography>
    )
}

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
