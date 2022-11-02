import { useMemo } from 'react'
import { useZionContext } from '../components/ZionContextProvider'
import { RoomIdentifier, Room } from '../types/matrix-types'

export function useRoom(roomId?: RoomIdentifier): Room | undefined {
    const { rooms } = useZionContext()
    const room = useMemo(() => (roomId ? rooms[roomId.matrixRoomId] : undefined), [roomId, rooms])
    // todo, figure out if a double useMemo is necessary or even helpful
    return useMemo(() => room, [room])
}
