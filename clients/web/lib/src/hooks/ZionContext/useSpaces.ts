/* eslint-disable @typescript-eslint/no-unused-vars */
import { useEffect, useState } from 'react'
import {
    EventType,
    IRoomTimelineData,
    MatrixEvent,
    Room as MatrixRoom,
    RoomEvent,
} from 'matrix-js-sdk'
import { ZionClient } from '../../client/ZionClient'
import { SpaceItem } from '../../types/matrix-types'
import { makeRoomIdentifier, RoomIdentifier } from '../../types/room-identifier'

export function useSpaces(
    client: ZionClient | undefined,
    spaceIds: RoomIdentifier[],
): {
    spaces: SpaceItem[]
} {
    const matrixClient = client?.matrixClient
    const [spaces, setSpaces] = useState<SpaceItem[]>([])

    useEffect(() => {
        if (!matrixClient) {
            return
        }
        const updateSpaces = () => {
            // don't bother with any deep comparision here, not expecting this to be called often
            setSpaces(
                spaceIds
                    .map((spaceId) => {
                        const room = client.getRoom(spaceId)
                        if (!room) {
                            return undefined
                        }
                        return toSpaceItem(room)
                    })
                    .filter((space) => space !== undefined) as SpaceItem[],
            )
        }
        // set initial state
        updateSpaces()
        // freakin matrix updates the name after
        // the timeline, listen here to avoid "Empty room"
        // showing up when we create a space
        const onRoomEvent = (room: MatrixRoom) => {
            if (spaceIds.find((s) => s.networkId === room.roomId)) {
                updateSpaces()
            }
        }
        // subscribe to changes
        const onRoomTimelineEvent = (
            event: MatrixEvent,
            room: MatrixRoom,
            toStartOfTimeline: boolean,
            removed: boolean,
            data: IRoomTimelineData,
        ) => {
            // if the room is a space update our spaces
            if (spaceIds.find((s) => s.networkId === room.roomId)) {
                const eventType = event.getType()
                if (
                    eventType === EventType.RoomCreate ||
                    eventType === EventType.RoomName ||
                    eventType === EventType.RoomAvatar
                ) {
                    updateSpaces()
                } else if (
                    eventType === EventType.RoomMember &&
                    event.getStateKey() === client.getUserId()
                ) {
                    updateSpaces()
                }
            }
        }

        matrixClient.on(RoomEvent.Name, onRoomEvent)
        matrixClient.on(RoomEvent.Timeline, onRoomTimelineEvent)
        return () => {
            matrixClient.off(RoomEvent.Name, onRoomEvent)
            matrixClient.off(RoomEvent.Timeline, onRoomTimelineEvent)
        }
    }, [client, matrixClient, spaceIds])

    return { spaces }
}

function toSpaceItem(room: MatrixRoom): SpaceItem {
    return {
        id: makeRoomIdentifier(room.roomId),
        name: room.name,
        avatarSrc: room.getMxcAvatarUrl() ?? '/placeholders/nft_29.png',
    }
}
