import { Box, Button, Divider, TextField, Theme, Typography } from '@mui/material'
import {
    Membership,
    RoomIdentifier,
    TimelineEvent,
    ZTEvent,
    useFullyReadMarker,
    useZionClient,
} from 'use-zion-client'
import React, { useCallback, useState } from 'react'
import { AcceptInvitation } from './AcceptInvitation'

interface Props {
    roomId: RoomIdentifier
    threadParentId?: string
    timeline: TimelineEvent[]
    membership: string
    sendMessage?: (roomId: RoomIdentifier, message: string) => Promise<void>
    joinRoom: (roomId: RoomIdentifier) => Promise<void>
}

export function ChatMessages(props: Props): JSX.Element {
    const { timeline, membership, roomId, threadParentId, sendMessage, joinRoom } = props
    const { sendReadReceipt, scrollback } = useZionClient()
    const unreadMarker = useFullyReadMarker(roomId, threadParentId)
    const [currentMessage, setCurrentMessage] = useState<string>('')
    const hasUnread = membership === Membership.Join && unreadMarker?.isUnread === true
    // pull if the first message is create, we've reached the end
    // Caveat, when we first sync the space in the sample app, there's a leave event
    // that's prepended to the timeline, not sure where the bug is
    // issue: https://github.com/HereNotThere/harmony/issues/443
    const canLoadMore =
        timeline.length > 1 &&
        timeline[0].content?.kind !== ZTEvent.RoomCreate &&
        timeline[1].content?.kind !== ZTEvent.RoomCreate

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
        void scrollback(roomId)
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
                        {canLoadMore && (
                            <Typography
                                key={-1}
                                display="block"
                                variant="body1"
                                component="button"
                                sx={buttonStyle}
                                onClick={onClickLoadMore}
                            >
                                Load More
                            </Typography>
                        )}
                        {timeline.map((m: TimelineEvent, index: number) => (
                            <ChatMessage event={m} key={m.eventId} />
                        ))}
                        {hasUnread && (
                            <>
                                <p style={{ ...smallStyle, alignSelf: 'center' }}>
                                    Unread Event: {truncateEventId(unreadMarker?.eventId ?? '')}
                                </p>
                                <Typography
                                    key={timeline.length}
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
        <Box display="flex" flexGrow="1" flexDirection="column">
            {chatMessages()}
            <Box display="flex" flexDirection="row" flexGrow={1} />
            {membership === Membership.Join && sendMessage !== undefined ? (
                <>
                    <Divider />
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
                </>
            ) : null}
        </Box>
    )
}

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
