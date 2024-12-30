import { UnpackEnvelopeOpts } from '@river-build/sdk'
import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const DEFAULT_UNPACK_ENVELOPE_OPTS: UnpackEnvelopeOpts = {
    disableSignatureValidation: true, // signature validation is too slow for large spaces
}

interface AppState {
    getTheme: () => 'dark' | 'light'
    toggleTheme: () => void
    userTheme?: 'dark' | 'light' | undefined
    setUserTheme: (theme: 'dark' | 'light') => void
    systemTheme?: 'dark' | 'light' | undefined
    setSystemTheme: (theme: 'dark' | 'light') => void
    paneSizes: { [id: string]: number }
    setPaneSize: (id: string, size: number) => void
    isWindowFocused: boolean
    setIsWindowFocused: (isWindowActive: boolean) => void
    setTownRouteBookmark: (spaceId: string, route: string) => void
    townRouteBookmarks: { [spaceId: string]: string }
    setUnpackEnvelopeOpts: (unpackEnvelopeOpts: UnpackEnvelopeOpts | undefined) => void
    unpackEnvelopeOpts?: UnpackEnvelopeOpts
    spaceIdBookmark?: string
    notificationRoute?: string
    setNotificationRoute: (route: string) => void
    didClosePWAPrompt: boolean
    setDidClosePWAPrompt: (didClosePWAPrompt: boolean) => void
    pushNotificationsPromptClosed: boolean
    setPushNotificationsPromptClosed: { (denied: boolean): void }
    setSearchTerms: (searchTerms: string) => void
    searchTerms: string
    sidePanel: string | null
    setSidePanel: (sidePanel: string | null) => void
    setBugReportCredentials: (value: Partial<{ name: string; email: string }>) => void
    bugReportCredentials: { name: string; email: string }
    recentlyMintedSpaceToken: { spaceId: string; isOwner: boolean } | undefined
    setRecentlyMintedSpaceToken: (value: { spaceId: string; isOwner: boolean } | undefined) => void
    seenChannelIds: string[]
    setSeenChannelIds: (seenChannelIds: string[]) => void
    favoriteChannelIds: string[]
    setFavoriteChannelIds: (favoriteChannelIds: string[]) => void
    setAppStoreBannerPresentedCount: (count: number) => void
    appStoreBannerPresentedCount: number
    fundWalletModalOpen: boolean
    setFundWalletModalOpen: (open: boolean) => void
}

export const GLOBAL_STORE_NAME = 'towns/global'

/**
 * ATTENTION: This store is persisted to local storage.
 * Make sure to skip storing anything that should only be in memory in the partialize function.
 */
export const useStore = create(
    persist<AppState>(
        (set, get) => ({
            getTheme: () => get().userTheme || get().systemTheme || 'dark',
            toggleTheme: () => {
                set((state) => ({
                    userTheme: state.getTheme() === 'light' ? 'dark' : 'light',
                }))
            },
            userTheme: undefined,
            setUserTheme: (userTheme) => {
                set(() => ({ userTheme }))
            },
            systemTheme: undefined,
            setSystemTheme: (systemTheme) => {
                set(() => ({ systemTheme }))
            },
            spaceIdBookmark: undefined,
            townRouteBookmarks: {},
            setTownRouteBookmark: (spaceId, route) => {
                set((state) => ({
                    // also set the spaceIdBookmark when setting the town route
                    spaceIdBookmark: spaceId ? spaceId : state.spaceIdBookmark,
                    townRouteBookmarks: { ...state.townRouteBookmarks, [spaceId]: route },
                }))
            },
            unpackEnvelopeOpts: undefined,
            setUnpackEnvelopeOpts: (unpackEnvelopeOpts) => {
                set(() => ({ unpackEnvelopeOpts }))
            },
            notificationRoute: undefined,
            setNotificationRoute: (route) => {
                set(() => ({ notificationRoute: route }))
            },

            isWindowFocused: true,
            setIsWindowFocused: (isWindowActive) => {
                set(() => ({ isWindowFocused: isWindowActive }))
            },

            channelMessageInputMap: {},

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
            recentlyMintedSpaceToken: undefined,
            setRecentlyMintedSpaceToken: (recentlyMintedSpaceToken) => {
                set(() => ({ recentlyMintedSpaceToken }))
            },
            seenChannelIds: [],
            setSeenChannelIds: (seenChannelIds) => {
                set(() => ({ seenChannelIds }))
            },
            favoriteChannelIds: [],
            setFavoriteChannelIds: (favoriteChannelIds) => {
                set(() => ({ favoriteChannelIds }))
            },
            appStoreBannerPresentedCount: 0,
            setAppStoreBannerPresentedCount: (appStoreBannerPresentedCount: number) => {
                set(() => ({ appStoreBannerPresentedCount }))
            },
            fundWalletModalOpen: false,
            setFundWalletModalOpen: (fundWalletModalOpen) => {
                set(() => ({ fundWalletModalOpen }))
            },
        }),
        {
            name: GLOBAL_STORE_NAME,
            version: 1,
            partialize: (state) => {
                const {
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    isWindowFocused,
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    searchTerms,
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    getTheme,
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    recentlyMintedSpaceToken,
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    fundWalletModalOpen,
                    // eslint-disable-next-line @typescript-eslint/no-unused-vars
                    setFundWalletModalOpen,
                    ...rest
                } = state
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
