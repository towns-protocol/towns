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
        const onStreamNewUserJoined = (streamId: string) => {
            updateState(streamId)
        }

        const onStreamUserLeft = (streamId: string) => {
            updateState(streamId)
        }

        const onUserLeftStream = (streamId: string) => {
            updateState(streamId)
        }

        const onPendingDisplayNameUpdated = (streamId: string) => {
            updateState(streamId)
        }

        client.on('streamNewUserJoined', onStreamNewUserJoined)
        client.on('streamUserLeft', onStreamUserLeft)
        client.on('userLeftStream', onUserLeftStream)
        client.on('streamDisplayNameUpdated', onPendingDisplayNameUpdated)
        client.on('streamPendingDisplayNameUpdated', onPendingDisplayNameUpdated)

        return () => {
            client.off('streamNewUserJoined', onStreamNewUserJoined)
            client.off('streamUserLeft', onStreamUserLeft)
            client.off('userLeftStream', onUserLeftStream)
            client.off('streamDisplayNameUpdated', onPendingDisplayNameUpdated)
            client.off('streamPendingDisplayNameUpdated', onPendingDisplayNameUpdated)
            setRooms({})
        }
    }, [client, isLoading, spaceInfo])
    return rooms
}
