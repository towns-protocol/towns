import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type UserState = {
    users: {
        [userId: string]: {
            orderedSpaces: string[]
        }
    }
    setOrderedSpaces: (userId: string, orderedSpaces: string[]) => void
}

export const useUserStore = create(
    persist<UserState>(
        (set, get) => ({
            users: {},
            setOrderedSpaces: (userId: string, orderedSpaces: string[]) => {
                set((state) => ({
                    users: {
                        ...state.users,
                        [userId]: {
                            orderedSpaces: orderedSpaces,
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
