import { create, StateCreator } from 'zustand'
import { createJSONStorage, persist, PersistOptions } from 'zustand/middleware'

export type SpaceNamesStates = {
    spaceNames: Record<string, string | undefined>
    setSpaceNames: (key: string, value: string | undefined) => void
}

type MyPersist = (
    config: StateCreator<SpaceNamesStates>,
    options: PersistOptions<SpaceNamesStates>,
) => StateCreator<SpaceNamesStates>

export const SPACE_NAMES_STORE_NAME = 'casablanca/spaceNames'

export const useSpaceNamesStore = create<SpaceNamesStates>(
    (persist as unknown as MyPersist)(
        (set) => ({
            spaceNames: {},
            setSpaceNames: (key: string, value: string | undefined) =>
                set((state) => {
                    const currentValue = state.spaceNames[key]
                    if (currentValue === value) {
                        return state
                    }
                    console.log(
                        `useSpaceNamesStore setSpaceNames: key=${key}, value=${value} currentValue=${currentValue}`,
                    )
                    return {
                        ...state,
                        spaceNames: {
                            ...state.spaceNames,
                            [key]: value,
                        },
                    }
                }),
        }),
        {
            name: SPACE_NAMES_STORE_NAME,
            storage: createJSONStorage(() => localStorage),
            version: 1,
        },
    ),
)
