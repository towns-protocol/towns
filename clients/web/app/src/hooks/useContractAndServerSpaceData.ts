import { useMemo } from 'react'
import { useSpaceData } from 'use-zion-client'
import { useContractSpaceInfo } from './useContractSpaceInfo'
import { useSpaceIdFromPathname } from './useSpaceInfoFromPathname'

export type ChainSpaceData = ReturnType<typeof useContractAndServerSpaceData>['chainSpace']

// Combines server and chain data to determine if a space is valid
export const useContractAndServerSpaceData = () => {
    const serverSpace = useSpaceData()
    const spaceId = useSpaceIdFromPathname()
    const { data, isLoading } = useContractSpaceInfo(spaceId)

    const space = useMemo(() => {
        return {
            chainSpace: data,
            chainSpaceLoading: isLoading,
            serverSpace: serverSpace,
        }
    }, [data, isLoading, serverSpace])

    return space
}
