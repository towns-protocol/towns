import React, { useCallback } from 'react'
import {
    Membership,
    RoomIdentifier,
    useMyMembership,
    useSpaceData,
    useSpaceTimeline,
    useZionClient,
} from 'use-zion-client'
import { useNavigate } from 'react-router-dom'
import { SpaceSettings } from './SpaceSettings'
import { ChatMessages } from '../components/ChatMessages'

export const SpacesIndex = () => {
    // console.log("SPACES INDEX");
    const navigate = useNavigate()
    const space = useSpaceData()
    const membership = useMyMembership(space?.id)
    const timeline = useSpaceTimeline()
    const { leaveRoom, sendMessage, joinRoom } = useZionClient()

    const onClickSettings = useCallback(() => {
        if (space?.id.slug) {
            navigate('/spaces/' + space.id.slug + '/settings')
        }
    }, [space?.id.slug, navigate])

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
        <h1>Space not found</h1>
    )
}
