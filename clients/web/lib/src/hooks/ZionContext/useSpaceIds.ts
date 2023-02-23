/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useRef, useState } from 'react'
import { ZionClient } from '../../client/ZionClient'
import { Membership } from '../../types/zion-types'
import { ClientEvent, Room as MatrixRoom, RoomEvent } from 'matrix-js-sdk'
import isEqual from 'lodash/isEqual'
import { makeRoomIdentifier, RoomIdentifier } from '../../types/room-identifier'
import create from 'zustand'

export type SpaceIdStore = {
    spaceIds: RoomIdentifier[]
}

export type SpaceIdStoreInterface = SpaceIdStore & {
    setSpaceIds: (fn: (prev: SpaceIdStore) => SpaceIdStore) => void
}

export const useSpaceIdStore = create<SpaceIdStoreInterface>((set) => ({
    spaceIds: [],
    setSpaceIds: (fn: (prevState: SpaceIdStore) => SpaceIdStore) => {
        set((state) => fn(state))
    },
}))

/// returns a stable list of space ids (if the networkId is the same, the object reference should stay the same)
export function useSpacesIds(client: ZionClient | undefined): {
    invitedToIds: RoomIdentifier[]
} {
    const matrixClient = client?.matrixClient
    const [invitedToIds, setInvitedToIds] = useState<RoomIdentifier[]>([])

    const { setSpaceIds } = useSpaceIdStore()

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

            setSpaceIds((prev) => {
                console.log(`useSpacesIds::setSpaceIds`, prev.spaceIds, newSpaceIds)
                if (isEqual(prev.spaceIds, newSpaceIds)) {
                    return prev
                }
                return { spaceIds: newSpaceIds }
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

    return { invitedToIds }
}
