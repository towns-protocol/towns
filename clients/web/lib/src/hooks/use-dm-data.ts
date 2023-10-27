import { useZionContext } from '../components/ZionContextProvider'
import { RoomIdentifier } from '../types/room-identifier'
import { useMemo } from 'react'

export function useDMData(roomId: RoomIdentifier) {
    const { dmChannels } = useZionContext()
    const data = useMemo(() => {
        return dmChannels.find((dm) => dm.id.networkId === roomId.networkId)
    }, [dmChannels, roomId])
    return { data }
}
