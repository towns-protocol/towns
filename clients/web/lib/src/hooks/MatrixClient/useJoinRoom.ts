import { useZionContext } from '../../components/ZionContextProvider'
import { useCallback } from 'react'
import { makeRoomIdentifier, RoomIdentifier } from '../../types/matrix-types'
import { useMatrixStore } from '../../store/use-matrix-store'

export const useJoinRoom = () => {
    const { client } = useZionContext()
    const { createRoom } = useMatrixStore()
    return useCallback(
        async (roomId: RoomIdentifier) => {
            try {
                if (client) {
                    const room = await client.joinRoom(roomId)
                    console.log(`Joined room[${roomId.matrixRoomId}]`, room)
                    createRoom(makeRoomIdentifier(room.roomId), room.isSpaceRoom())
                }
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
            } catch (ex: any) {
                console.error(`Error joining room[${roomId.matrixRoomId}]`, (ex as Error)?.stack)
            }
        },
        [createRoom, client],
    )
}
