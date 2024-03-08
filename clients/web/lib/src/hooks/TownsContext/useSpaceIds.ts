import { useEffect } from 'react'
import isEqual from 'lodash/isEqual'
import { create } from 'zustand'
import { Client as CasablancaClient } from '@river/sdk'
import { useSpacesIds_Casablanca } from './useSpaceIds_Casablanca'

export type SpaceIdStore = {
    spaceIds: string[]
}

export type SpaceIdStoreInterface = SpaceIdStore & {
    setSpaceIds: (fn: (prev: SpaceIdStore) => SpaceIdStore) => void
}

export const useSpaceIdStore = create<SpaceIdStoreInterface>((set) => ({
    spaceIds: [],
    setSpaceIds: (fn: (prevState: SpaceIdStore) => SpaceIdStore) => {
        set((state) => fn(state))
    },
}))

/// returns a stable list of space ids (if the networkId is the same, the object reference should stay the same)
export function useSpacesIds(casablancaClient: CasablancaClient | undefined) {
    const { setSpaceIds } = useSpaceIdStore()

    const { spaceIds } = useSpacesIds_Casablanca(casablancaClient)

    useEffect(() => {
        const newSpaceIds = spaceIds
        setSpaceIds((prev) => {
            if (isEqual(prev.spaceIds, newSpaceIds)) {
                return prev
            }
            console.log(`useSpacesIds::setSpaceIds aggregated`, {
                prev: prev.spaceIds,
                newSpaceIds,
            })
            return { spaceIds: newSpaceIds }
        })
    }, [spaceIds, setSpaceIds])
}
