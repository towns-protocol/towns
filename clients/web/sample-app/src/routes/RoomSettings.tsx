import React from 'react'
import { Divider } from '@mui/material'
import { useParams } from 'react-router-dom'
import { useRoom, useZionContext } from 'use-zion-client'

export const RoomSettings = () => {
    const { spaceSlug, channelSlug } = useParams()
    const { matrixClient } = useZionContext()
    // if we have a room id, use it, otherwise pull up the space id
    const targetId = channelSlug || spaceSlug
    const roomId = targetId ? targetId : undefined
    const room = useRoom(roomId)
    const matrixRoom = roomId ? matrixClient?.getRoom(roomId) : undefined
    const joinRule = matrixRoom ? matrixRoom.getJoinRule() : 'unknown'

    return room ? (
        <>
            <h2>Settings</h2>
            <p>
                <b>RoomName:</b> {room.name}
            </p>
            <p>
                <b>RoomId:</b> {room.id}
            </p>
            <p>
                <b>IsSpaceRoom:</b> {room.isSpaceRoom ? 'true' : 'false'}
            </p>
            <p>
                <b>Join Rule:</b> {joinRule}
            </p>
            <Divider />
        </>
    ) : (
        <div>
            <h2>Room Not Found</h2>
        </div>
    )
}
