import { useTownsContext } from '../components/TownsContextProvider'
import { useMemo } from 'react'
import { useMyProfile } from './use-my-profile'

export function useDMData(roomId?: string) {
    const userId = useMyProfile()?.userId

    const { dmChannels } = useTownsContext()
    const data = useMemo(() => {
        return dmChannels.find((dm) => dm.id === roomId)
    }, [dmChannels, roomId])

    const counterParty = useMemo(() => {
        return data?.userIds.find((u) => u !== userId)
    }, [data, userId])

    return { data, counterParty }
}
