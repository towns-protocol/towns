import {
    Client as CasablancaClient,
    isSpaceStreamId,
    isChannelStreamId,
    isDMChannelStreamId,
    isGDMChannelStreamId,
} from '@river/sdk'
import { useEffect, useState } from 'react'
import { toZionCasablancaRoom } from '../../store/use-casablanca-store'
import { Membership, Room } from '../../types/zion-types'
import isEqual from 'lodash/isEqual'
import { useSpaceNames } from '../use-space-data'

export function useCasablancaRooms(client?: CasablancaClient): Record<string, Room | undefined> {
    const [rooms, setRooms] = useState<Record<string, Room | undefined>>({})
    const { data: spaceInfo, isLoading } = useSpaceNames(client)

    //TODO: placeholder for working with Rooms in Casablanca
    useEffect(() => {
        if (!client) {
            return
        }

        // helpers
        const updateState = (streamId: string) => {
            const newRoom = streamId ? toZionCasablancaRoom(streamId, client, spaceInfo) : undefined
            setRooms((prev) => {
                const prevRoom = prev[streamId]
                const prevMember = prevRoom?.membership === Membership.Join
                const newMember = newRoom?.membership === Membership.Join
                // in the case of a user leaving a room, they should still get the latest update
                // if they were not a member before and still aren't, then don't update
                if (!prevMember && !newMember) {
                    return prev
                }
                return isEqual(prevRoom, newRoom) ? prev : { ...prev, [streamId]: newRoom }
            })
        }

        const setInitialState = () => {
            setRooms({})
            const allChannelsAndSpaces = client.streams
                .getStreamIds()
                .filter((stream) => {
                    return (
                        isSpaceStreamId(stream) ||
                        isChannelStreamId(stream) ||
                        isDMChannelStreamId(stream) ||
                        isGDMChannelStreamId(stream)
                    )
                })
                .reduce((acc: Record<string, Room | undefined>, stream: string) => {
                    acc[stream] = toZionCasablancaRoom(stream, client, spaceInfo)
                    return acc
                }, {})
            setRooms(allChannelsAndSpaces)
        }

        // initial state
        setInitialState()

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

        client.on('streamNewUserJoined', onStreamUpdated)
        client.on('streamUserLeft', onStreamUpdated)
        client.on('userLeftStream', onStreamUpdated)
        client.on('streamInitialized', onStreamUpdated)
        client.on('streamDisplayNameUpdated', onStreamUpdated)
        client.on('streamPendingDisplayNameUpdated', onStreamUpdated)
        client.on('streamUsernameUpdated', onStreamUpdated)
        client.on('streamPendingUsernameUpdated', onStreamUpdated)
        return () => {
            client.off('streamNewUserJoined', onStreamUpdated)
            client.off('streamUserLeft', onStreamUpdated)
            client.off('userLeftStream', onStreamUpdated)
            client.off('streamInitialized', onStreamUpdated)
            client.off('streamDisplayNameUpdated', onStreamUpdated)
            client.off('streamPendingDisplayNameUpdated', onStreamUpdated)
            client.off('streamUsernameUpdated', onStreamUpdated)
            client.off('streamPendingUsernameUpdated', onStreamUpdated)
            setRooms({})
        }
    }, [client, isLoading, spaceInfo])
    return rooms
}
