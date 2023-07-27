import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppState {
    theme?: 'dark' | 'light'
    setTheme: (theme: 'dark' | 'light') => void
    paneSizes: { [id: string]: number }
    setPaneSize: (id: string, size: number) => void
    isWindowFocused: boolean
    setIsWindowFocused: (isWindowActive: boolean) => void
    setChannelmessageInput: (id: string, value: string) => void
    channelMessageInputMap: { [inputId: string]: string }
    dismissedGettingStartedMap: { [spaceId: string]: string }
    setDismissedGettingStarted: (spaceId: string) => void
    setTownRouteBookmark: (spaceId: string, route: string) => void
    townRouteBookmarks: { [spaceId: string]: string }
    spaceIdBookmark?: string
    didClosePWAPrompt: boolean
    setDidClosePWAPrompt: (didClosePWAPrompt: boolean) => void
    pushNotificationsPromptClosed: boolean
    setPushNotificationsPromptClosed: { (denied: boolean): void }
}

export const GLOBAL_STORE_NAME = 'towns/global'

export const useStore = create(
    persist<AppState>(
        (set, get) => ({
            theme: undefined,
            setTheme: (theme) => {
                set(() => ({ theme }))
            },

            spaceIdBookmark: undefined,
            townRouteBookmarks: {},
            setTownRouteBookmark: (spaceId, route) => {
                set(() => ({
                    // also set the spaceIdBookmark when setting the town route
                    spaceIdBookmark: spaceId,
                    townRouteBookmarks: { ...get().townRouteBookmarks, [spaceId]: route },
                }))
            },

            isWindowFocused: true,
            setIsWindowFocused: (isWindowActive) => {
                set(() => ({ isWindowFocused: isWindowActive }))
            },

            channelMessageInputMap: {},
            dismissedGettingStartedMap: {},
            setDismissedGettingStarted: (spacedId) => {
                const _map = get().dismissedGettingStartedMap
                _map[spacedId] = spacedId
                set(() => ({ dismissedGettingStartedMap: _map }))
            },
            setChannelmessageInput: (id, value) => {
                const userInput = get().channelMessageInputMap
                userInput[id] = value
                set(() => ({ channelMessageInputMap: userInput }))
            },

            paneSizes: {},
            setPaneSize: (id: string, size: number) =>
                set((state) => {
                    return {
                        paneSizes: {
                            ...state.paneSizes,
                            [id]: size,
                        },
                    }
                }),
            didClosePWAPrompt: false,
            setDidClosePWAPrompt: (didClosePWAPrompt) => {
                set(() => ({ didClosePWAPrompt }))
            },
            pushNotificationsPromptClosed: false,
            setPushNotificationsPromptClosed: (denied) => {
                set(() => ({ pushNotificationsPromptClosed: denied }))
            },
        }),
        {
            name: GLOBAL_STORE_NAME,
            version: 1,
        },
    ),
)
