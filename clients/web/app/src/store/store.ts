import create from 'zustand'
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
}

export const useStore = create(
    persist<AppState>(
        (set, get) => ({
            theme: undefined,
            setTheme: (theme) => {
                set(() => ({ theme }))
            },

            isWindowFocused: true,
            setIsWindowFocused: (isWindowActive) => {
                set(() => ({ isWindowFocused: isWindowActive }))
            },

            channelMessageInputMap: {},
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
        }),
        { name: 'zionstate' },
    ),
)
