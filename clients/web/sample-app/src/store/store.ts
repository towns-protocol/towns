import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppStates {
    homeServerUrl: string | null
    saveHomeServerUrl: (url: string | null) => void
}

export const useSampleAppStore = create(
    persist<AppStates>(
        (set) => ({
            homeServerUrl: null,
            saveHomeServerUrl: (homeServerUrl: string | null) =>
                set({ homeServerUrl: homeServerUrl }),
        }),
        { name: 'sampleAppStates', getStorage: () => localStorage },
    ),
)
