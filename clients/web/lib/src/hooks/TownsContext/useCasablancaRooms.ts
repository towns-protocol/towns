import {
    Client as CasablancaClient,
    isSpaceStreamId,
    isChannelStreamId,
    isDMChannelStreamId,
    isGDMChannelStreamId,
    toMembership,
} from '@towns-protocol/sdk'
import { useEffect } from 'react'
import { Room } from '../../types/towns-types'
import isEqual from 'lodash/isEqual'
import { TownsOpts } from '../../client/TownsClientTypes'
import { create } from 'zustand'

export type RoomDataStore = {
    rooms: Record<string, Room>
    setRoomData: (streamId: string, room: Room) => void
}

const useRoomDataStore = create<RoomDataStore>((set) => ({
    rooms: {},
    setRoomData: (streamId: string, room: Room) =>
        set((state) => {
            const prevRoom = state.rooms[streamId]
            if (isEqual(prevRoom, room)) {
                return state
            }
            return { rooms: { ...state.rooms, [streamId]: room } }
        }),
}))

export function useCasablancaRooms(
    _opts: TownsOpts,
    client?: CasablancaClient,
): Record<string, Room | undefined> {
    const { rooms } = useRoomDataStore()

    //TODO: placeholder for working with Rooms in Casablanca
    useEffect(() => {
        if (!client) {
            return
        }

        // helpers
        const updateState = (streamId: string) => {
            const newRoom = toCasablancaRoom(streamId, client)
            if (newRoom) {
                useRoomDataStore.getState().setRoomData(streamId, newRoom)
            }
        }

        // subscribe to changes
        const onStreamUpdated = (streamId: string) => {
            if (
                isSpaceStreamId(streamId) ||
                isChannelStreamId(streamId) ||
                isDMChannelStreamId(streamId) ||
                isGDMChannelStreamId(streamId)
            ) {
                updateState(streamId)
            }
        }

        const onAutojoinUpdated = (_spaceId: string, channelId: string, _isAutojoin: boolean) => {
            updateState(channelId)
        }

        const onHideUserJoinLeaveEventsUpdated = (
            _spaceId: string,
            channelId: string,
            _hideUserJoinLeaveEvents: boolean,
        ) => {
            updateState(channelId)
        }

        client.on('streamNewUserJoined', onStreamUpdated)
        client.on('streamUserLeft', onStreamUpdated)
        client.on('userStreamMembershipChanged', onStreamUpdated)
        client.on('streamInitialized', onStreamUpdated)
        client.on('spaceChannelAutojoinUpdated', onAutojoinUpdated)
        client.on('spaceChannelHideUserJoinLeaveEventsUpdated', onHideUserJoinLeaveEventsUpdated)

        return () => {
            client.off('streamNewUserJoined', onStreamUpdated)
            client.off('streamUserLeft', onStreamUpdated)
            client.off('userStreamMembershipChanged', onStreamUpdated)
            client.off('streamInitialized', onStreamUpdated)
            client.off('spaceChannelAutojoinUpdated', onAutojoinUpdated)
            client.off(
                'spaceChannelHideUserJoinLeaveEventsUpdated',
                onHideUserJoinLeaveEventsUpdated,
            )
        }
    }, [client])
    return rooms
}

/**
 * Get room entity filled with data for specific stream. Applicable for Channels and Spaces stream only.
 * @param streamId - The streamId of the channel or space.
 * @param client - The Casablanca client.
 * @returns Room entity filled with data for specific stream. Throw error if membership is not valid or streamId is not associated with a channel or space.
 */
function toCasablancaRoom(streamId: string, client: CasablancaClient): Room | undefined {
    //reject if client is not defined
    if (!client) {
        throw new Error('Client not defined')
    }

    const userStreamId = client.userStreamId
    if (!userStreamId) {
        throw new Error('User not logged in')
    }
    const userStream = client.streams.get(userStreamId)
    if (!userStream) {
        throw new Error('User not logged in')
    }

    //reject if streamId is not associated with a channel, space or DM
    if (
        !isSpaceStreamId(streamId) &&
        !isChannelStreamId(streamId) &&
        !isDMChannelStreamId(streamId) &&
        !isGDMChannelStreamId(streamId)
    ) {
        throw new Error('Invalid streamId: ' + streamId)
    }

    const stream = client.streams.get(streamId)
    if (!stream) {
        return undefined
    }

    return {
        id: streamId,
        membership: toMembership(userStream.view.userContent.getMembership(streamId)?.op),
        members: Array.from(stream.view.getMembers().membership.joinedUsers),
    }
}
