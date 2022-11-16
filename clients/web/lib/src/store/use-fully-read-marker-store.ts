import { FullyReadMarker } from '../types/timeline-types'
import create, { StateCreator } from 'zustand'
import { persist, PersistOptions } from 'zustand/middleware'

export type FullyReadMarkerStoreStates = {
    counts: Record<string, number>
    markers: Record<string, FullyReadMarker>
}

export type FullyReadMarkerStoreInterface = FullyReadMarkerStoreStates & {
    setState: (fn: (prev: FullyReadMarkerStoreStates) => FullyReadMarkerStoreStates) => void
}

type MyPersist = (
    config: StateCreator<FullyReadMarkerStoreInterface>,
    options: PersistOptions<FullyReadMarkerStoreInterface>,
) => StateCreator<FullyReadMarkerStoreInterface>

export const useFullyReadMarkerStore = create<FullyReadMarkerStoreInterface>(
    (persist as unknown as MyPersist)(
        (set) => ({
            counts: {},
            markers: {},
            setState: (
                fn: (prevState: FullyReadMarkerStoreStates) => FullyReadMarkerStoreStates,
            ) => {
                set((state) => fn(state))
            },
        }),
        {
            name: 'fully-read-markers',
            getStorage: () => localStorage,
        },
    ),
)
