import { useZionContext } from '../components/ZionContextProvider'
import { RoomIdentifier } from '../types/room-identifier'
import { useMemo } from 'react'
import { useMyProfile } from './use-my-profile'

export function useDMData(roomId?: RoomIdentifier) {
    const userId = useMyProfile()?.userId

    const { dmChannels } = useZionContext()
    const data = useMemo(() => {
        return dmChannels.find((dm) => dm.id.networkId === roomId?.networkId)
    }, [dmChannels, roomId])

    const counterParty = useMemo(() => {
        return data?.userIds.find((u) => u !== userId)
    }, [data, userId])

    return { data, counterParty }
}
