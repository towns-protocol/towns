import React, { useCallback } from 'react'
import { useNavigate } from 'react-router'
import { RoomIdentifier, useZionClient } from 'use-zion-client'
import { Box, Card } from '@ui'
import { useCardOpenerContext } from 'ui/components/Overlay/CardOpenerContext'
import { MenuItem } from './MenuItem'

type Props = { spaceId: RoomIdentifier; spaceName: string }

export const SpaceSettingsCard = (props: Props) => {
    const { spaceId } = props

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
        navigate(`/spaces/${spaceId.slug}/settings`)
        closeCard()
    }, [closeCard, navigate, spaceId.slug])

    const onSettingsLegacyClick = useCallback(() => {
        navigate(`/spaces/${spaceId.slug}/settings-legacy`)
        closeCard()
    }, [closeCard, navigate, spaceId.slug])

    return (
        <Box position="relative">
            <Card border width="300" fontSize="md" paddingY="sm" role="navigation">
                <MenuItem icon="settings" onClick={onSettingsClick}>
                    Space Manager (WIP)
                </MenuItem>
                <MenuItem icon="settings" onClick={onSettingsLegacyClick}>
                    Settings
                </MenuItem>
                <MenuItem color="cta1" icon="logout" onClick={onLeaveClick}>
                    Leave {props.spaceName}
                </MenuItem>
            </Card>
        </Box>
    )
}
