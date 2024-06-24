import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type UserState = {
    users: {
        [userId: string]: {
            favoriteSpaces: string[]
        }
    }
    setFavoriteSpaces: (userId: string, favoriteSpaces: string[]) => void
}

export const useUserStore = create(
    persist<UserState>(
        (set, get) => ({
            users: {},
            setFavoriteSpaces: (userId: string, favoriteSpaces: string[]) => {
                set((state) => ({
                    users: {
                        ...state.users,
                        [userId]: {
                            favoriteSpaces,
                        },
                    },
                }))
            },
        }),
        {
            name: 'towns/user-settings',
            partialize: (state) => ({ users: state.users } as UserState),
        },
    ),
)
