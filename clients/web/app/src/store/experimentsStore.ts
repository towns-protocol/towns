import create from 'zustand'
import { persist } from 'zustand/middleware'

export interface ExperimentsState {
    /// enableInlineThreadUpdates: render collapsed thread updates in the main timeline
    enableInlineThreadUpdates: boolean
    setState: (partial: Partial<ExperimentsState>) => void
}

export const useExperimentsStore = create(
    persist<ExperimentsState>(
        (set) => ({
            enableInlineThreadUpdates: false,
            setState: (partial: Partial<ExperimentsState>) =>
                set((state) => {
                    return {
                        ...state,
                        ...partial,
                    }
                }),
        }),
        {
            name: 'zion/experiments-store',
        },
    ),
)
