/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useRef, useState } from 'react'
import { ZionClient } from '../../client/ZionClient'
import { Membership } from '../../types/zion-types'
import { ClientEvent, Room as MatrixRoom, RoomEvent } from 'matrix-js-sdk'
import isEqual from 'lodash/isEqual'
import { makeRoomIdentifier, RoomIdentifier } from '../../types/room-identifier'

/// returns a stable list of space ids (if the networkId is the same, the object reference should stay the same)
export function useSpacesIds(client: ZionClient | undefined): {
    spaceIds: RoomIdentifier[]
    invitedToIds: RoomIdentifier[]
} {
    const matrixClient = client?.matrixClient
    const cache = useRef<Record<string, RoomIdentifier>>({})
    const [spaceIds, setSpaceIds] = useState<RoomIdentifier[]>([])
    const [invitedToIds, setInvitedToIds] = useState<RoomIdentifier[]>([])

    // ensure that for the same roomId, we always return the same roomIdentifier reference
    const getOrCreateRoomIdentifier = (roomId: string): RoomIdentifier => {
        if (cache.current[roomId]) {
            return cache.current[roomId]
        }
        const roomIdentifier = makeRoomIdentifier(roomId)
        cache.current[roomId] = roomIdentifier
        return roomIdentifier
    }

    useEffect(() => {
        if (!matrixClient) {
            return
        }
        console.log('useSpacesIds::starting effect')
        // local data
        let _invitedToIds: RoomIdentifier[] = []
        // wrap up state interaction
        const updateSpaceAndInviteIds = () => {
            const newSpaceIds = matrixClient
                .getRooms()
                .filter((r) => r.isSpaceRoom() && r.getMyMembership() === Membership.Join)
                .map((r) => getOrCreateRoomIdentifier(r.roomId))

            const newInviteIds = matrixClient
                .getRooms()
                .filter((r) => r.getMyMembership() === Membership.Invite)
                .map((r) => getOrCreateRoomIdentifier(r.roomId))
            _invitedToIds = newInviteIds.slice()

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
            if (
                room.isSpaceRoom() ||
                room.getMyMembership() === Membership.Invite ||
                _invitedToIds.find((r) => r.networkId === room.roomId)
            ) {
                updateSpaceAndInviteIds()
            }
        }

        // for some stupid reason the matrix client stores the room after sending membership events
        matrixClient.on(RoomEvent.MyMembership, onNewRoomOrMyMembership)
        matrixClient.on(ClientEvent.Room, onNewRoomOrMyMembership)
        return () => {
            matrixClient.off(RoomEvent.MyMembership, onNewRoomOrMyMembership)
            matrixClient.off(ClientEvent.Room, onNewRoomOrMyMembership)
        }
    }, [matrixClient])

    return { spaceIds, invitedToIds }
}
