import { useEffect, useMemo, useRef, useState } from 'react'
import { useTownsContext } from '../components/TownsContextProvider'
import { Room } from '../types/towns-types'
import isEqual from 'lodash/isEqual'

export function useRoom(roomId?: string): Room | undefined {
    const { rooms } = useTownsContext()
    return useMemo(() => (roomId ? rooms[roomId] : undefined), [roomId, rooms])
}

export function useRoomWithStreamId(streamId?: string): Room | undefined {
    const { rooms } = useTownsContext()
    return useMemo(() => (streamId ? rooms[streamId] : undefined), [streamId, rooms])
}

export function useRoomNames(roomIds: string[]): Record<string, string> {
    const { rooms } = useTownsContext()
    const roomIdsRef = useRef<string[]>([])
    const [stableRooms, setStableRooms] = useState<Record<string, string>>(() =>
        updateRoomNames(roomIds, rooms),
    )
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
                stableRoomIds.some((id) => !isEqual(prev[id], rooms[id]?.name)) !== undefined
            if (needsUpdate) {
                return updateRoomNames(stableRoomIds, rooms)
            } else {
                return prev
            }
        })
    }, [rooms, stableRoomIds])

    return stableRooms
}

function updateRoomNames(stableRoomIds: string[], rooms: Record<string, Room | undefined>) {
    return stableRoomIds.reduce((acc, id) => {
        const room = rooms[id]
        if (room !== undefined) {
            acc[id] = room.name
        }
        return acc
    }, {} as Record<string, string>)
}
