/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useState } from 'react'
import { ZionClient } from '../../client/ZionClient'
import { Membership } from '../../types/matrix-types'
import { ClientEvent, Room as MatrixRoom, RoomEvent } from 'matrix-js-sdk'
import { isEqual } from 'lodash'

export function useSpacesIds(client: ZionClient | undefined): {
    spaceIds: string[]
    invitedToIds: string[]
} {
    const [spaceIds, setSpaceIds] = useState<string[]>([])
    const [invitedToIds, setInvitedToIds] = useState<string[]>([])

    useEffect(() => {
        if (!client) {
            return
        }
        console.log('USE SPACE IDS::starting effect')
        // wrap up state interaction
        const updateSpaceAndInviteIds = () => {
            const newSpaceIds = client
                .getRooms()
                .filter((r) => r.isSpaceRoom() && r.getMyMembership() === Membership.Join)
                .map((r) => r.roomId)

            const newInviteIds = client
                .getRooms()
                .filter((r) => r.getMyMembership() === Membership.Invite)
                .map((r) => r.roomId)

            setSpaceIds((prev) => {
                if (isEqual(prev, newSpaceIds)) {
                    return prev
                }
                return newSpaceIds
            })

            setInvitedToIds((prev) => {
                if (isEqual(prev, newInviteIds)) {
                    return prev
                }
                return newInviteIds
            })
        }
        // first time init
        updateSpaceAndInviteIds()
        // listen for the appropriate events
        const onNewRoomOrMyMembership = (room: MatrixRoom) => {
            if (!room.isSpaceRoom() && room.getMyMembership() !== Membership.Invite) {
                return
            }
            updateSpaceAndInviteIds()
        }
        // for some stupid reason the matrix client stores the room after sending membership events
        client.on(RoomEvent.MyMembership, onNewRoomOrMyMembership)
        client.on(ClientEvent.Room, onNewRoomOrMyMembership)
        return () => {
            client.off(RoomEvent.MyMembership, onNewRoomOrMyMembership)
            client.off(ClientEvent.Room, onNewRoomOrMyMembership)
        }
    }, [client])

    return { spaceIds, invitedToIds }
}
