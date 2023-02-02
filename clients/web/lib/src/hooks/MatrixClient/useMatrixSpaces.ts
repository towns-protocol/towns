import { useEffect, useState } from 'react'
import { EventType, MatrixClient, MatrixEvent, Room as MatrixRoom, RoomEvent } from 'matrix-js-sdk'
import { SpaceItem } from '../../types/zion-types'
import { makeRoomIdentifier, RoomIdentifier } from '../../types/room-identifier'
import { SpaceProtocol } from '../../client/ZionClientTypes'

export function useMatrixSpaces(
    spaceIds: RoomIdentifier[],
    matrixClient?: MatrixClient,
): SpaceItem[] {
    const [spaces, setSpaces] = useState<SpaceItem[]>([])

    useEffect(() => {
        // update the matrix spaces
        if (!matrixClient) {
            return
        }
        const updateSpaces = () => {
            // don't bother with any deep comparision here, not expecting this to be called often
            setSpaces(
                spaceIds
                    .filter((spaceId) => spaceId.protocol === SpaceProtocol.Matrix)
                    .map((spaceId) => {
                        const room = matrixClient.getRoom(spaceId.networkId)
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
        const onRoomTimelineEvent = (event: MatrixEvent, eventRoom: MatrixRoom | undefined) => {
            const eventRoomId = event.getRoomId() ?? eventRoom?.roomId
            if (!eventRoomId) {
                return
            }
            // if the room is a space update our spaces
            if (spaceIds.find((s) => s.networkId === eventRoomId)) {
                const eventType = event.getType()
                if (
                    eventType === EventType.RoomCreate ||
                    eventType === EventType.RoomName ||
                    eventType === EventType.RoomAvatar
                ) {
                    updateSpaces()
                } else if (
                    eventType === EventType.RoomMember &&
                    event.getStateKey() === matrixClient.getUserId()
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
    }, [matrixClient, spaceIds])

    return spaces
}

function toSpaceItem(room: MatrixRoom): SpaceItem {
    return {
        id: makeRoomIdentifier(room.roomId),
        name: room.name,
        avatarSrc: room.getMxcAvatarUrl() ?? '/placeholders/nft_29.png',
    }
}
