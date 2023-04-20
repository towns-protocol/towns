import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { TownsEnvironment } from 'utils/environment'

interface AppStates {
    environment?: TownsEnvironment
    setEnvironment: (environment: TownsEnvironment) => void
}

export const useSampleAppStore = create(
    persist<AppStates>(
        (set) => ({
            environment: undefined,
            setEnvironment: (environment: TownsEnvironment) =>
                set({
                    environment: environment,
                }),
        }),
        { name: 'sampleAppStates', getStorage: () => localStorage },
    ),
)
