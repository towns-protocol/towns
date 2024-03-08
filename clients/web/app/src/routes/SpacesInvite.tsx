import React, { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { useSpaceData, useTownsClient } from 'use-towns-client'
import { PATHS } from 'routes'
import { InviteUserToRoomForm } from '@components/Web3'
import { Stack } from '@ui'

export const SpacesInvite = () => {
    const { inviteUser } = useTownsClient()
    const space = useSpaceData()

    const navigate = useNavigate()

    const onCancelClicked = useCallback(() => {
        navigate(space?.id ? `/${PATHS.SPACES}/${space.id}` : '/')
    }, [navigate, space?.id])

    const onInviteClicked = useCallback(
        async (spaceId: string, roomId: string | undefined, inviteeUserId: string) => {
            await inviteUser(spaceId, inviteeUserId)
            navigate(`/${PATHS.SPACES}/${spaceId}/`)
        },
        [inviteUser, navigate],
    )

    return (
        <Stack alignItems="center" height="100%">
            <Stack grow width="600">
                {space ? (
                    <InviteUserToRoomForm
                        spaceName={space.name}
                        spaceId={space.id}
                        onCancelClicked={onCancelClicked}
                        onInviteClicked={onInviteClicked}
                    />
                ) : (
                    <div>404</div>
                )}
            </Stack>
        </Stack>
    )
}
