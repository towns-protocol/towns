import React, { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { useChannelData, useSpaceData, useTownsClient } from 'use-towns-client'
import { PATHS } from 'routes'
import { Stack } from '@ui'
import { InviteUserToRoomForm } from '@components/Web3'

export const ChannelSettings = () => {
    const { inviteUser } = useTownsClient()
    const navigate = useNavigate()
    const space = useSpaceData()
    const { spaceId, channelId, channel } = useChannelData()

    const onCancelClicked = useCallback(() => {
        if (!spaceId) {
            return
        }
        navigate(`/${PATHS.SPACES}/${spaceId}/channels/${channelId}/`)
    }, [channelId, navigate, spaceId])

    const onInviteClicked = useCallback(
        async (spaceId: string, roomId: string | undefined, inviteeUserId: string) => {
            await inviteUser(roomId ?? spaceId, inviteeUserId)
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
                        roomName={channel?.label}
                        roomId={channelId}
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
