/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useRef, useState } from 'react'
import { Membership } from '../../types/zion-types'
import { ClientEvent, MatrixClient, Room as MatrixRoom, RoomEvent } from 'matrix-js-sdk'
import isEqual from 'lodash/isEqual'
import { makeRoomIdentifier, RoomIdentifier } from '../../types/room-identifier'

/// returns a stable list of space ids (if the networkId is the same, the object reference should stay the same)
export function useSpacesIds_Matrix(matrixClient: MatrixClient | undefined): {
    invitedToIds: RoomIdentifier[]
    spaceIds: RoomIdentifier[]
} {
    const [invitedToIds, setInvitedToIds] = useState<RoomIdentifier[]>([])
    const [spaceIds, setSpaceIds] = useState<RoomIdentifier[]>([])

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
                .map((r) => makeRoomIdentifier(r.roomId))

            const newInviteIds = matrixClient
                .getRooms()
                .filter((r) => r.getMyMembership() === Membership.Invite)
                .map((r) => makeRoomIdentifier(r.roomId))
            _invitedToIds = newInviteIds.slice()

            setSpaceIds((prevSpaceIds) => {
                console.log(`useSpacesIds::setSpaceIds`, { prevSpaceIds, newSpaceIds })
                if (isEqual(prevSpaceIds, newSpaceIds)) {
                    return prevSpaceIds
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
    }, [matrixClient, setSpaceIds])

    return { invitedToIds, spaceIds }
}
