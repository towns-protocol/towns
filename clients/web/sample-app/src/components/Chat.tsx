import { Box, Grid, Theme, Typography } from '@mui/material'
import { useChannelData, useChannelTimeline, useZionClient } from 'use-zion-client'
import React, { useCallback, useState } from 'react'

import { useNavigate } from 'react-router-dom'
import { ChatMessages } from './ChatMessages'
import { LeaveRoomButton } from './Buttons/LeaveRoomButton'
import { SettingsButton } from './Buttons/SettingsButton'
import { LargeToast } from './LargeToast'

interface Props {
    roomId: string
    membership: string
    onClickLeaveRoom: () => void
    goToRoom: (spaceId: string, channelId: string) => void
}

export function Chat(props: Props): JSX.Element {
    const { spaceId, channelId, channel } = useChannelData()
    const { leaveRoom, joinRoom, sendMessage } = useZionClient()
    const navigate = useNavigate()
    const { timeline } = useChannelTimeline()
    const [joinFailed, setJoinFailed] = useState(false)

    const onClickSettings = useCallback(() => {
        if (!spaceId) {
            throw new Error('No space id')
        }
        navigate('/spaces/' + spaceId + '/channels/' + channelId + '/settings')
    }, [spaceId, channelId, navigate])

    const onClickLeaveRoom = useCallback(async () => {
        await leaveRoom(channelId)
        props.onClickLeaveRoom()
    }, [channelId, leaveRoom, props])

    const onClickSendMessage = useCallback(
        async (roomId: string, message: string) => {
            await sendMessage(roomId, message)
        },
        [sendMessage],
    )

    const onClickJoinRoom = useCallback(
        async (roomId: string) => {
            if (!spaceId) {
                throw new Error('No space id')
            }
            const room = await joinRoom(roomId)
            if (room) {
                setJoinFailed(false)
                props.goToRoom(spaceId, channelId)
            } else {
                setJoinFailed(true)
            }
        },
        [channelId, joinRoom, props, spaceId],
    )

    const roomName = channel?.label ?? ''

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
                    <LeaveRoomButton onClick={onClickLeaveRoom} />
                </Grid>
            </Grid>
            {joinFailed ? (
                <LargeToast message="Join room failed" />
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
