import React, { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { RoomIdentifier, useChannelId, useMyMembership } from 'use-zion-client'
import { Chat } from '../components/Chat'

export const ChannelsIndex = () => {
    const navigate = useNavigate()
    const channelId = useChannelId()
    const membership = useMyMembership(channelId)

    const onClickLeaveRoom = useCallback(() => {
        navigate('/')
    }, [navigate])

    const goToRoom = useCallback(
        (spaceId: RoomIdentifier, channelId: RoomIdentifier) => {
            navigate('/spaces/' + spaceId.streamId + '/channels/' + channelId.streamId + '/')
        },
        [navigate],
    )

    return (
        <Chat
            roomId={channelId}
            membership={membership}
            goToRoom={goToRoom}
            onClickLeaveRoom={onClickLeaveRoom}
        />
    )
}
