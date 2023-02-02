import { useMemo } from 'react'
import { useZionContext } from '../components/ZionContextProvider'
import { Room } from '../types/zion-types'
import { RoomIdentifier } from '../types/room-identifier'

export function useRoom(roomId?: RoomIdentifier): Room | undefined {
    const { rooms } = useZionContext()
    const room = useMemo(() => (roomId ? rooms[roomId.networkId] : undefined), [roomId, rooms])
    // todo, figure out if a double useMemo is necessary or even helpful
    return useMemo(() => room, [room])
}
