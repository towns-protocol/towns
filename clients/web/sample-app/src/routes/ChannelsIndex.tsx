import React, { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useChannelId, useMyMembership } from 'use-zion-client'
import { Chat } from '../components/Chat'

export const ChannelsIndex = () => {
    const navigate = useNavigate()
    const channelId = useChannelId()
    const membership = useMyMembership(channelId)

    const onClickLeaveRoom = useCallback(() => {
        navigate('/')
    }, [navigate])

    const goToRoom = useCallback(
        (spaceId: string, channelId: string) => {
            navigate('/spaces/' + spaceId + '/channels/' + channelId + '/')
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
