import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { AppProgressState } from '../AppProgressState'

type State = {
    appProgressOverlay: AppProgressState
    setAppProgressOverlay: (state: AppProgressState) => void
    optimisticInitializedSpaces: string[]
    setOptimisticSpaceInitialized: (spaceId: string, initialized?: boolean) => void
}

export const useAppProgressStore = create(
    persist<State>(
        (set, get) => ({
            appProgressOverlay: AppProgressState.None,
            setAppProgressOverlay: (state: AppProgressState) => {
                set({ appProgressOverlay: state })
            },
            optimisticInitializedSpaces: [],
            setOptimisticSpaceInitialized: (spaceId: string, initialized = true) => {
                set((state) => {
                    if (initialized) {
                        return state.optimisticInitializedSpaces.some((s) => s === spaceId)
                            ? state
                            : {
                                  optimisticInitializedSpaces: [
                                      ...state.optimisticInitializedSpaces,
                                      spaceId,
                                  ],
                              }
                    } else {
                        return {
                            optimisticInitializedSpaces: state.optimisticInitializedSpaces.filter(
                                (id) => id !== spaceId,
                            ),
                        }
                    }
                })
            },
        }),
        {
            version: 1,
            name: 'towns/login-state',
            partialize: (state) => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { appProgressOverlay, ...rest } = state
                return rest as State
            },
        },
    ),
)
