import { create } from 'zustand'
import { FullyReadMarker } from '@river-build/proto'

export type FullyReadMarkerStoreStates = {
    markers: Record<string, FullyReadMarker>
}

export type FullyReadMarkerStoreInterface = FullyReadMarkerStoreStates & {
    setState: (fn: (prev: FullyReadMarkerStoreStates) => FullyReadMarkerStoreStates) => void
}

export const useFullyReadMarkerStore = create<FullyReadMarkerStoreInterface>((set) => ({
    counts: {},
    markers: {},
    setState: (fn: (prevState: FullyReadMarkerStoreStates) => FullyReadMarkerStoreStates) => {
        set((state) => fn(state))
    },
}))
