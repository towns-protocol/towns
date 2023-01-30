import React, { useCallback } from 'react'
import Gleap from 'gleap'
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

    const onInviteClick = useCallback(() => {
        navigate(`/spaces/${spaceId.slug}/invite`)
        closeCard()
    }, [closeCard, navigate, spaceId.slug])

    const { leaveRoom } = useZionClient()
    const onLeaveClick = useCallback(async () => {
        await leaveRoom(spaceId)
        navigate('/')
        closeCard()
    }, [closeCard, leaveRoom, navigate, spaceId])

    const onSettingsClick = useCallback(() => {
        navigate(`/spaces/${spaceId.slug}/settings`)
        closeCard()
    }, [closeCard, navigate, spaceId.slug])

    const onSettingsLegacyClick = useCallback(() => {
        navigate(`/spaces/${spaceId.slug}/settings-legacy`)
        closeCard()
    }, [closeCard, navigate, spaceId.slug])

    const onFeedback = useCallback(() => {
        Gleap.startFeedbackFlow('bugreporting', true)
    }, [])

    return (
        <Box position="relative">
            <Card border width="300" fontSize="md" paddingY="sm" role="navigation">
                <MenuItem selected icon="invite" tabIndex={0} onClick={onInviteClick}>
                    Invite
                </MenuItem>
                <MenuItem icon="settings" onClick={onSettingsClick}>
                    Space Manager (WIP)
                </MenuItem>
                <MenuItem icon="settings" onClick={onSettingsLegacyClick}>
                    Settings
                </MenuItem>
                <MenuItem color="secondary" icon="logout" onClick={onLeaveClick}>
                    Leave {props.spaceName}
                </MenuItem>

                <MenuItem color="secondary" icon="logout" onClick={onFeedback}>
                    Feedback (file bug)
                </MenuItem>
            </Card>
        </Box>
    )
}
