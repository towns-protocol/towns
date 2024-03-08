import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface AppState {
    theme?: 'dark' | 'light'
    setTheme: (theme: 'dark' | 'light') => void
    paneSizes: { [id: string]: number }
    setPaneSize: (id: string, size: number) => void
    isWindowFocused: boolean
    setIsWindowFocused: (isWindowActive: boolean) => void
    dismissedGettingStartedMap: { [spaceId: string]: string }
    setDismissedGettingStarted: (spaceId: string) => void
    setTownRouteBookmark: (spaceId: string, route: string) => void
    townRouteBookmarks: { [spaceId: string]: string }
    spaceIdBookmark?: string
    didClosePWAPrompt: boolean
    setDidClosePWAPrompt: (didClosePWAPrompt: boolean) => void
    pushNotificationsPromptClosed: boolean
    setPushNotificationsPromptClosed: { (denied: boolean): void }
    setSearchTerms: (searchTerms: string) => void
    searchTerms: string
    mutedChannelIds: string[]
    setMutedChannelIds: (mutedChannelIds: string[]) => void
    sidePanel: string | null
    setSidePanel: (sidePanel: string | null) => void
    setBugReportCredentials: (value: Partial<{ name: string; email: string }>) => void
    bugReportCredentials: { name: string; email: string }
    recentlyMintedSpaceIds: string[]
    setRecentlyMintedSpaceIds: (spaceIds: string[]) => void
}

export const GLOBAL_STORE_NAME = 'towns/global'

export const useStore = create(
    persist<AppState>(
        (set) => ({
            theme: undefined,
            setTheme: (theme) => {
                set(() => ({ theme }))
            },
            setMutedChannelIds: (mutedChannelIds: string[]) => {
                set(() => ({ mutedChannelIds }))
            },
            mutedChannelIds: [],
            spaceIdBookmark: undefined,
            townRouteBookmarks: {},
            setTownRouteBookmark: (spaceId, route) => {
                set((state) => ({
                    // also set the spaceIdBookmark when setting the town route
                    spaceIdBookmark: spaceId,
                    townRouteBookmarks: { ...state.townRouteBookmarks, [spaceId]: route },
                }))
            },

            isWindowFocused: true,
            setIsWindowFocused: (isWindowActive) => {
                set(() => ({ isWindowFocused: isWindowActive }))
            },

            channelMessageInputMap: {},
            dismissedGettingStartedMap: {},
            setDismissedGettingStarted: (spacedId) => {
                set((state) => ({
                    dismissedGettingStartedMap: {
                        ...state.dismissedGettingStartedMap,
                        [spacedId]: spacedId,
                    },
                }))
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
            searchTerms: '',
            setSearchTerms: (searchTerms) => {
                set(() => ({ searchTerms }))
            },
            sidePanel: null,
            setSidePanel: (sidePanel) => {
                set(() => ({ sidePanel }))
            },
            bugReportCredentials: { name: '', email: '' },
            setBugReportCredentials: (
                bugReportCredentials: Partial<{ name: string; email: string }>,
            ) => {
                set((state) => ({
                    bugReportCredentials: {
                        ...state.bugReportCredentials,
                        ...bugReportCredentials,
                    },
                }))
            },
            recentlyMintedSpaceIds: [],
            setRecentlyMintedSpaceIds: (spaceIds) => {
                set(() => ({ recentlyMintedSpaceIds: spaceIds }))
            },
        }),
        {
            name: GLOBAL_STORE_NAME,
            version: 1,
            partialize: (state) => {
                // probably should not save the isWindowFocused state
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { isWindowFocused, searchTerms, ...rest } = state
                return rest as AppState
            },
        },
    ),
)

interface InputStoreState {
    setChannelmessageInput: (id: string, value: string) => void
    channelMessageInputMap: { [inputId: string]: string }
}

export const GLOBAL_INPUT_STORE_NAME = 'towns/input'

export const useInputStore = create(
    persist<InputStoreState>(
        (set) => ({
            channelMessageInputMap: {},
            setChannelmessageInput: (id, value) => {
                set((state) => ({
                    channelMessageInputMap: { ...state.channelMessageInputMap, [id]: value },
                }))
            },
        }),
        {
            name: GLOBAL_INPUT_STORE_NAME,
            version: 1,
        },
    ),
)
