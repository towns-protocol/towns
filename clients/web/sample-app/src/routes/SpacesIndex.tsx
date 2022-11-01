import React, { useCallback } from 'react'
import {
    Channel,
    ChannelGroup,
    Membership,
    RoomIdentifier,
    useMyMembership,
    useSpaceData,
    useSpaceTimeline,
    useZionClient,
    useZionContext,
} from 'use-zion-client'
import { List, ListItem, ListItemText } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { SpaceSettings } from './SpaceSettings'
import { ChatMessages } from '../components/ChatMessages'

export const SpacesIndex = () => {
    // console.log("SPACES INDEX");
    const navigate = useNavigate()
    const space = useSpaceData()
    const membership = useMyMembership(space?.id)
    const timeline = useSpaceTimeline()
    const { unreadCounts, mentionCounts } = useZionContext()
    const { leaveRoom, sendMessage, joinRoom } = useZionClient()

    const getChannelPostfix = useCallback(
        (roomId: RoomIdentifier) => {
            const unreadPostfix = unreadCounts[roomId.matrixRoomId] > 0 ? ' *' : ''
            const mentionPostfix =
                mentionCounts[roomId.matrixRoomId] > 0
                    ? ` (${mentionCounts[roomId.matrixRoomId]})`
                    : ''
            return `${unreadPostfix}${mentionPostfix}`
        },
        [mentionCounts, unreadCounts],
    )

    const onClickSettings = useCallback(() => {
        if (space?.id.slug) {
            navigate('/spaces/' + space.id.slug + '/settings')
        }
    }, [space?.id.slug, navigate])

    const onClickChannel = useCallback(
        (roomId: RoomIdentifier) => {
            if (space?.id.slug) {
                navigate(`/spaces/${space.id.slug}/channels/${roomId.slug}/`)
            }
        },
        [space?.id.slug, navigate],
    )

    const onCreateChannelClick = useCallback(() => {
        navigate('/spaces/' + space?.id.slug + '/channels/new')
    }, [navigate, space?.id.slug])

    const onClickInvite = useCallback(() => {
        navigate('/spaces/' + space?.id.slug + '/invite')
    }, [navigate, space?.id.slug])

    const onClickLeaveSpace = useCallback(async () => {
        if (space?.id) {
            await leaveRoom(space.id)
            navigate('/')
        }
    }, [leaveRoom, navigate, space?.id])

    const onClickSendMessage = useCallback(
        (roomId: RoomIdentifier, message: string) => {
            return sendMessage(roomId, message)
        },
        [sendMessage],
    )

    const onClickJoinRoom = useCallback(
        async (roomId: RoomIdentifier) => {
            await joinRoom(roomId)
        },
        [joinRoom],
    )

    return space ? (
        <>
            {membership === Membership.Join && (
                <>
                    <div>
                        <button onClick={onClickSettings}>Space settings</button>
                    </div>
                    <div>
                        <button onClick={onCreateChannelClick}>Create a channel</button>
                    </div>
                    <div>
                        <button onClick={onClickInvite}>Invite to space</button>
                    </div>
                    <div>
                        <button onClick={onClickLeaveSpace}>Leave space</button>
                    </div>
                    <div>
                        {space?.id ? <SpaceSettings spaceId={space.id.matrixRoomId} /> : null}
                    </div>
                    {space && (
                        <>
                            <h3>Channels:</h3>
                            <List>
                                {space.channelGroups.flatMap((r: ChannelGroup) =>
                                    r.channels.map((c: Channel) => (
                                        <ListItem
                                            button
                                            key={c.id.slug}
                                            onClick={() => onClickChannel(c.id)}
                                        >
                                            <ListItemText>
                                                {c.label + getChannelPostfix(c.id)}
                                            </ListItemText>
                                        </ListItem>
                                    )),
                                )}
                            </List>
                        </>
                    )}
                </>
            )}
            <h3>Space Messages</h3>
            <ChatMessages
                roomId={space.id}
                timeline={timeline}
                membership={membership}
                sendMessage={onClickSendMessage}
                joinRoom={onClickJoinRoom}
            />
        </>
    ) : (
        <h1> Space not found</h1>
    )
}
