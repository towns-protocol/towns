import React, { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { useSpaceId } from 'use-towns-client'
import { Membership } from '@river-build/sdk'
import { CreateChannelForm } from '../components/CreateChannelForm'

export const SpacesNewChannel = () => {
    console.log('spaces new channel')
    const spaceId = useSpaceId()
    const navigate = useNavigate()
    const onSpaceCreated = useCallback(
        (roomId: string, membership: Membership) => {
            navigate('/spaces/' + spaceId + '/channels/' + roomId + '/')
        },
        [navigate, spaceId],
    )
    return spaceId ? (
        <CreateChannelForm parentSpaceId={spaceId} onClick={onSpaceCreated} />
    ) : (
        <h3>404</h3>
    )
}
