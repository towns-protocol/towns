import { useMemo } from 'react'
import { useTownsContext } from '../components/TownsContextProvider'
import { Room } from '../types/towns-types'

export function useRoom(roomId?: string): Room | undefined {
    const { rooms } = useTownsContext()
    return useMemo(() => (roomId ? rooms[roomId] : undefined), [roomId, rooms])
}

export function useRoomWithStreamId(streamId?: string): Room | undefined {
    const { rooms } = useTownsContext()
    return useMemo(() => (streamId ? rooms[streamId] : undefined), [streamId, rooms])
}
