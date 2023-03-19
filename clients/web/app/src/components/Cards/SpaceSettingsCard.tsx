import React, { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { Permission, RoomIdentifier, useZionClient } from 'use-zion-client'
import { PATHS } from 'routes'
import { Box, Card } from '@ui'
import { useCardOpenerContext } from 'ui/components/Overlay/CardOpenerContext'
import { MenuItem } from './MenuItem'

type Props = { spaceId: RoomIdentifier; spaceName: string; canEditSettings: boolean }

export const SpaceSettingsCard = (props: Props) => {
    const { spaceId, canEditSettings } = props

    const navigate = useNavigate()

    const { closeCard } = useCardOpenerContext()

    const { leaveRoom } = useZionClient()
    const onLeaveClick = useCallback(async () => {
        await leaveRoom(spaceId)
        // TODO: this is a hack to wait for leave to propogate and update useZionContext().spaces
        // if you leave a space and navigate back to NoJoinedSpacesFallback, this space you are leaving still shows up
        setTimeout(() => {
            navigate('/')
            closeCard()
        }, 1000)
    }, [closeCard, leaveRoom, navigate, spaceId])

    const onSettingsClick = useCallback(() => {
        navigate(`/${PATHS.SPACES}/${spaceId.slug}/settings`)
        closeCard()
    }, [closeCard, navigate, spaceId.slug])

    return (
        <Box position="relative">
            <Card border width="300" fontSize="md" paddingY="sm" role="navigation">
                {canEditSettings && (
                    <MenuItem icon="settings" onClick={onSettingsClick}>
                        Settings
                    </MenuItem>
                )}
                <MenuItem color="error" icon="logout" onClick={onLeaveClick}>
                    Leave {props.spaceName}
                </MenuItem>
            </Card>
        </Box>
    )
}
