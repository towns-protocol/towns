import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppStates {
    environment?: string
    setEnvironment: (environment: string) => void
}

export const useSampleAppStore = create(
    persist<AppStates>(
        (set) => ({
            environment: undefined,
            setEnvironment: (environment: string) =>
                set({
                    environment: environment,
                }),
        }),
        { name: 'sampleAppStates', getStorage: () => localStorage },
    ),
)
