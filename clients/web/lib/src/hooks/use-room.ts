import { useEffect, useMemo, useRef, useState } from 'react'
import { useZionContext } from '../components/ZionContextProvider'
import { Room } from '../types/zion-types'
import { RoomIdentifier } from '../types/room-identifier'
import isEqual from 'lodash/isEqual'

export function useRoom(roomId?: RoomIdentifier): Room | undefined {
    const { rooms } = useZionContext()
    return useMemo(() => (roomId ? rooms[roomId.streamId] : undefined), [roomId, rooms])
}

export function useRoomWithStreamId(streamId?: string): Room | undefined {
    const { rooms } = useZionContext()
    return useMemo(() => (streamId ? rooms[streamId] : undefined), [streamId, rooms])
}

export function useRoomNames(roomIds: RoomIdentifier[]): Record<string, string> {
    const { rooms } = useZionContext()
    const roomIdsRef = useRef<RoomIdentifier[]>([])
    const [stableRooms, setStableRooms] = useState<Record<string, string>>({})
    const stableRoomIds = useMemo(() => {
        if (isEqual(roomIds, roomIdsRef.current)) {
            return roomIdsRef.current
        }
        roomIdsRef.current = roomIds
        return roomIds
    }, [roomIds])

    useEffect(() => {
        setStableRooms((prev) => {
            const needsUpdate =
                stableRoomIds.find(
                    (id) => !isEqual(prev[id.streamId], rooms[id.streamId]?.name),
                ) !== undefined
            if (needsUpdate) {
                return stableRoomIds.reduce((acc, id) => {
                    const room = rooms[id.streamId]
                    if (room !== undefined) {
                        acc[id.streamId] = room.name
                    }
                    return acc
                }, {} as Record<string, string>)
            } else {
                return prev
            }
        })
    }, [rooms, stableRoomIds])

    return stableRooms
}
