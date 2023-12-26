import React, { useCallback } from 'react'
import { useSpaceData, useZionClient } from 'use-zion-client'
import { useNavigate } from 'react-router-dom'

import { InviteForm } from '../components/InviteForm'

export function SpaceInvite() {
    const space = useSpaceData()
    const navigate = useNavigate()
    const { inviteUser } = useZionClient()

    const onClickSendInvite = useCallback(
        async (spaceId: string, inviteeId: string) => {
            await inviteUser(spaceId, inviteeId)
            navigate('/spaces/' + spaceId + '/')
        },
        [inviteUser, navigate],
    )

    const onClickCancel = useCallback(async () => {
        navigate('/spaces/' + space?.id + '/')
    }, [navigate, space?.id])

    return space ? (
        <InviteForm
            isSpace
            roomId={space.id}
            roomName={space.name}
            sendInvite={onClickSendInvite}
            onClickCancel={onClickCancel}
        />
    ) : (
        <div>
            <h2>Space Not Found</h2>
        </div>
    )
}
