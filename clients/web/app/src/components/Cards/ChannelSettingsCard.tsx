import { Permission, RoomIdentifier, useHasPermission, useZionClient } from 'use-zion-client'

import React from 'react'
import { useEvent } from 'react-use-event-hook'
import { useNavigate } from 'react-router'
import { PATHS } from 'routes'
import { Box, Card } from '@ui'
import { useAuth } from 'hooks/useAuth'
import { useStore } from 'store/store'
import { MenuItem } from './MenuItem'

type Props = {
    spaceId: RoomIdentifier
    channelId: RoomIdentifier
    channelName: string
    onShowChannelSettingsPopup: () => void
}

export const ChannelSettingsCard = (props: Props) => {
    const { channelId, spaceId, channelName } = props
    const { loggedInWalletAddress } = useAuth()
    const { hasPermission: canEditChannel } = useHasPermission({
        spaceId: spaceId.networkId,
        channelId: channelId.networkId,
        walletAddress: loggedInWalletAddress ?? '',
        permission: Permission.ModifySpaceSettings,
    })
    const navigate = useNavigate()
    const setTownRouteBookmark = useStore((s) => s.setTownRouteBookmark)

    const { leaveRoom } = useZionClient()

    const onLeaveClick = useEvent(async () => {
        setTownRouteBookmark(spaceId.slug, '')
        await leaveRoom(channelId)
        navigate(`/${PATHS.SPACES}/${spaceId.slug}/`)
    })

    const onInfoClick = useEvent(() => {
        navigate(`/${PATHS.SPACES}/${spaceId.slug}/channels/${channelId.slug}/info?channel`)
    })

    const onEditClick = useEvent(() => {
        props.onShowChannelSettingsPopup()
    })

    return (
        <Box position="relative">
            <Card border paddingY="sm" width="300" fontSize="md">
                <MenuItem icon="help" onClick={onInfoClick}>
                    Info
                </MenuItem>

                {canEditChannel && (
                    <MenuItem icon="edit" onClick={onEditClick}>
                        Edit channel
                    </MenuItem>
                )}

                <MenuItem icon="logout" color="error" onClick={onLeaveClick}>
                    Leave {channelName}
                </MenuItem>
            </Card>
        </Box>
    )
}
