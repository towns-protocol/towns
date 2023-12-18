import React, { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { RoomIdentifier, useChannelData, useSpaceData, useZionClient } from 'use-zion-client'
import { PATHS } from 'routes'
import { Stack } from '@ui'
import { InviteUserToRoomForm } from '@components/Web3'

export const ChannelSettings = () => {
    const { inviteUser } = useZionClient()
    const navigate = useNavigate()
    const space = useSpaceData()
    const { spaceId, channelId, channel } = useChannelData()

    const onCancelClicked = useCallback(() => {
        if (!spaceId) {
            return
        }
        navigate(`/${PATHS.SPACES}/${spaceId.streamId}/channels/${channelId.streamId}/`)
    }, [channelId.streamId, navigate, spaceId])

    const onInviteClicked = useCallback(
        async (
            spaceId: RoomIdentifier,
            roomId: RoomIdentifier | undefined,
            inviteeUserId: string,
        ) => {
            await inviteUser(roomId ?? spaceId, inviteeUserId)
            navigate(`/${PATHS.SPACES}/${spaceId.streamId}/`)
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
