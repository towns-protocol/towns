import { RoomIdentifier, useZionClient } from 'use-zion-client'

import React from 'react'
import useEvent from 'react-use-event-hook'
import { useNavigate } from 'react-router'
import { PATHS } from 'routes'
import { Box, Card } from '@ui'
import { MenuItem } from './MenuItem'

type Props = {
    spaceId: RoomIdentifier
    channelId: RoomIdentifier
    channelName: string
    onShowChannelSettingsPopup: () => void
}

export const ChannelSettingsCard = (props: Props) => {
    const { channelId, spaceId, channelName } = props

    const navigate = useNavigate()

    const { leaveRoom } = useZionClient()

    const onLeaveClick = useEvent(async () => {
        await leaveRoom(channelId)
        navigate('/')
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

                <MenuItem icon="edit" onClick={onEditClick}>
                    Edit channel
                </MenuItem>

                <MenuItem icon="logout" color="error" onClick={onLeaveClick}>
                    Leave {channelName}
                </MenuItem>
            </Card>
        </Box>
    )
}
