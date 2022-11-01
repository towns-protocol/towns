import { Box, Grid, Theme, Typography } from '@mui/material'
import { RoomIdentifier, useChannelData, useChannelTimeline, useZionClient } from 'use-zion-client'
import React, { useCallback, useEffect, useState } from 'react'

import { useNavigate } from 'react-router-dom'
import { ChatMessages } from './ChatMessages'
import { InviteButton } from './Buttons/InviteButton'
import { InviteForm } from './InviteForm'
import { LeaveRoomButton } from './Buttons/LeaveRoomButton'
import { SettingsButton } from './Buttons/SettingsButton'

interface Props {
    roomId: RoomIdentifier
    membership: string
    onClickLeaveRoom: () => void
    goToRoom: (spaceId: RoomIdentifier, channelId: RoomIdentifier) => void
}

export function Chat(props: Props): JSX.Element {
    const { spaceId, channelId, channel } = useChannelData()
    const { inviteUser, leaveRoom, joinRoom, sendMessage } = useZionClient()
    const [showInviteForm, setShowInviteForm] = useState<boolean>(false)
    const navigate = useNavigate()
    const timeline = useChannelTimeline()

    const onClickSettings = useCallback(() => {
        navigate('/spaces/' + spaceId.slug + '/channels/' + channelId.slug + '/settings')
    }, [spaceId.slug, channelId.slug, navigate])

    const onClickLeaveRoom = useCallback(async () => {
        await leaveRoom(channelId)
        props.onClickLeaveRoom()
    }, [channelId, leaveRoom, props])

    const onClickOpenInviteForm = useCallback(() => {
        setShowInviteForm(true)
    }, [])

    const onClickCloseInviteForm = useCallback(() => {
        setShowInviteForm(false)
    }, [])

    const onClickSendInvite = useCallback(
        async (roomId: RoomIdentifier, inviteeId: string) => {
            setShowInviteForm(false)
            await inviteUser(roomId, inviteeId)
        },
        [inviteUser],
    )

    const onClickSendMessage = useCallback(
        async (roomId: RoomIdentifier, message: string) => {
            await sendMessage(roomId, message)
        },
        [sendMessage],
    )

    const onClickJoinRoom = useCallback(
        async (roomId: RoomIdentifier) => {
            await joinRoom(roomId)
            props.goToRoom(spaceId, channelId)
        },
        [channelId, joinRoom, props, spaceId],
    )

    const roomName = channel?.label ?? ''

    useEffect(() => {
        setShowInviteForm(false)
    }, [props.roomId])

    return (
        <Box
            display="flex"
            flexDirection="column"
            sx={{
                height: { xs: '140px' },
            }}
        >
            <Grid container spacing={2}>
                <Grid item xs={9} md={9}>
                    <Typography variant="h6" component="span" sx={headerStyle}>
                        {roomName}
                    </Typography>
                </Grid>
                <Grid item xs={1} md={1}>
                    <SettingsButton onClick={onClickSettings} />
                </Grid>
                <Grid item xs={1} md={1}>
                    <InviteButton onClick={onClickOpenInviteForm} />
                </Grid>
                <Grid item xs={1} md={1}>
                    <LeaveRoomButton onClick={onClickLeaveRoom} />
                </Grid>
            </Grid>
            {showInviteForm ? (
                <InviteForm
                    roomId={props.roomId}
                    roomName={roomName}
                    sendInvite={onClickSendInvite}
                    onClickCancel={onClickCloseInviteForm}
                />
            ) : (
                <ChatMessages
                    roomId={props.roomId}
                    timeline={timeline}
                    membership={props.membership}
                    sendMessage={onClickSendMessage}
                    joinRoom={onClickJoinRoom}
                />
            )}
        </Box>
    )
}

const headerStyle = {
    padding: (theme: Theme) => theme.spacing(1),
    gap: (theme: Theme) => theme.spacing(1),
}
