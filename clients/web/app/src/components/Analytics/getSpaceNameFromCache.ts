import { useSpaceDataStore } from 'use-towns-client'

export const getSpaceNameFromCache = (spaceId: string | undefined) => {
    if (!spaceId) {
        return undefined
    }
    return useSpaceDataStore.getState().spaceDataMap?.[spaceId]?.name
}
