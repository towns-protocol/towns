import { Client as CasablancaClient, isSpaceStreamId, isChannelStreamId } from '@river/sdk'
import { useEffect, useState } from 'react'
import { toZionCasablancaRoom } from '../../store/use-casablanca-store'
import { Room } from '../../types/zion-types'
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
            const stream = client.streams.get(streamId)
            const memberships = stream?.view.getMemberships()
            if (!memberships?.isMemberJoined()) {
                return
            }
            const newRoom = streamId ? toZionCasablancaRoom(streamId, client, spaceInfo) : undefined
            setRooms((prev) =>
                isEqual(prev[streamId], newRoom) ? prev : { ...prev, [streamId]: newRoom },
            )
        }

        const setInitialState = () => {
            setRooms({})
            const allChannelsAndSpaces = Array.from(client.streams.keys())
                .filter((stream) => {
                    return isSpaceStreamId(stream) || isChannelStreamId(stream)
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

        client.on('streamNewUserJoined', onStreamNewUserJoined)
        client.on('streamUserLeft', onStreamUserLeft)
        client.on('userLeftStream', onUserLeftStream)

        return () => {
            client.off('streamNewUserJoined', onStreamNewUserJoined)
            client.off('streamUserLeft', onStreamUserLeft)
            client.off('userLeftStream', onUserLeftStream)
            setRooms({})
        }
    }, [client, isLoading, spaceInfo])
    return rooms
}
