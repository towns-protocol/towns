import { persist, PersistStorage, StorageValue } from 'zustand/middleware'
import debounce from 'lodash/debounce'
import Dexie from 'dexie'
import { LookupUser } from 'types/user-lookup'
import { shallow } from 'zustand/shallow'

import { dlogger } from '@river-build/dlog'
import { createWithEqualityFn } from 'zustand/traditional'

const dlog = dlogger('csb:store:user-lookup')

type UserLookupStore = {
    spaceUsers: Record<string, Record<string, LookupUser>>
    channelUsers: Record<string, Record<string, LookupUser>> // for DM and GDM channels
    fallbackUserLookups: Record<string, LookupUser>
    allUsers: Record<string, Record<string, LookupUser>>
    setSpaceUser: (userId: string, user: LookupUser, spaceId?: string) => void
    setChannelUser: (userId: string, user: LookupUser, channelId?: string) => void
    lookupUser: (userId: string, spaceId?: string, channelId?: string) => LookupUser | undefined
    updateUserEverywhere: (userId: string, updatedUser: (user: LookupUser) => LookupUser) => void
}

type OmitFunctions<T> = {
    // eslint-disable-next-line @typescript-eslint/ban-types
    [K in keyof T]: T[K] extends Function ? never : K
}[keyof T]

type UserLookupStoreData = Pick<UserLookupStore, OmitFunctions<UserLookupStore>>

const db = new Dexie('userlookup')

db.version(1).stores({
    userLookup: 'key,spaceUsers,channelUsers,fallbackUserLookups',
})

const debouncedSave = debounce(
    async (name: string, value: StorageValue<UserLookupStoreData>) => {
        dlog.info('debouncedSave', name, value)
        const spaceUsers = value.state.spaceUsers
        const channelUsers = value.state.channelUsers
        const fallbackUserLookups = value.state.fallbackUserLookups
        await db
            .table('userLookup')
            .put({ key: name, spaceUsers, channelUsers, fallbackUserLookups })
    },
    250,
    { maxWait: 500 },
)

const userLookupStorage: PersistStorage<UserLookupStoreData> = {
    async getItem(name: string) {
        const item = await db.table<UserLookupStore, string>('userLookup').get({ key: name })

        return {
            state: item ?? {
                spaceUsers: {},
                channelUsers: {},
                fallbackUserLookups: {},
                allUsers: {},
            },
        }
    },
    async setItem(name: string, value: StorageValue<UserLookupStoreData>) {
        await debouncedSave(name, value)
    },
    async removeItem(name: string) {
        dlog.info('removeItem', name)
        await db.table('userLookup').delete(name)
    },
}

export const useUserLookupStore = createWithEqualityFn<UserLookupStore>()(
    persist(
        (set, get) => ({
            spaceUsers: {},
            channelUsers: {},
            fallbackUserLookups: {},
            allUsers: {},
            setSpaceUser: (userId, user, spaceId) => {
                set((state) => {
                    if (spaceId) {
                        const newAllUsers = { ...state.allUsers }
                        if (!newAllUsers[userId]) {
                            newAllUsers[userId] = {}
                        }
                        newAllUsers[userId] = { ...newAllUsers[userId], [spaceId]: { ...user } }

                        const newSpaceUsers = { ...state.spaceUsers }
                        if (!newSpaceUsers[spaceId]) {
                            newSpaceUsers[spaceId] = {}
                        }
                        newSpaceUsers[spaceId] = {
                            ...newSpaceUsers[spaceId],
                            [userId]: { ...user },
                        }

                        const newFallbackUserLookups = { ...state.fallbackUserLookups }
                        if (
                            typeof user?.username === 'string' &&
                            user.username.length > 0 &&
                            !newFallbackUserLookups[userId]?.username
                        ) {
                            newFallbackUserLookups[userId] = { ...user }
                        }

                        return {
                            ...state,
                            allUsers: newAllUsers,
                            spaceUsers: newSpaceUsers,
                            fallbackUserLookups: newFallbackUserLookups,
                        }
                    }
                    return state
                })
            },
            setChannelUser: (userId, user, channelId) => {
                set((state) => {
                    if (channelId) {
                        const newChannelUsers = { ...state.channelUsers }
                        if (!newChannelUsers[channelId]) {
                            newChannelUsers[channelId] = {}
                        }
                        newChannelUsers[channelId] = {
                            ...newChannelUsers[channelId],
                            [userId]: { ...user },
                        }

                        return {
                            ...state,
                            channelUsers: newChannelUsers,
                        }
                    }
                    return state
                })
            },
            lookupUser: (userId, spaceId, channelId) => {
                const state = get()
                return userLookupFn(state, userId, spaceId, channelId)
            },
            updateUserEverywhere: (userId: string, updater: (user: LookupUser) => LookupUser) => {
                set((state) => {
                    const newSpaceUsers = { ...state.spaceUsers }
                    const newChannelUsers = { ...state.channelUsers }
                    const newFallbackUserLookups = { ...state.fallbackUserLookups }
                    const newAllUsers = { ...state.allUsers }

                    for (const spaceId in newSpaceUsers) {
                        if (newSpaceUsers[spaceId][userId]) {
                            newSpaceUsers[spaceId] = {
                                ...newSpaceUsers[spaceId],
                                [userId]: updater(newSpaceUsers[spaceId][userId]),
                            }
                        }
                    }

                    for (const channelId in newChannelUsers) {
                        if (newChannelUsers[channelId][userId]) {
                            newChannelUsers[channelId] = {
                                ...newChannelUsers[channelId],
                                [userId]: updater(newChannelUsers[channelId][userId]),
                            }
                        }
                    }

                    if (newFallbackUserLookups[userId]) {
                        newFallbackUserLookups[userId] = updater(newFallbackUserLookups[userId])
                    }

                    if (newAllUsers[userId]) {
                        newAllUsers[userId] = Object.fromEntries(
                            Object.entries(newAllUsers[userId]).map(([streamId, user]) => [
                                streamId,
                                updater(user),
                            ]),
                        )
                    }

                    return {
                        ...state,
                        spaceUsers: newSpaceUsers,
                        channelUsers: newChannelUsers,
                        fallbackUserLookups: newFallbackUserLookups,
                        allUsers: newAllUsers,
                    }
                })
            },
        }),
        {
            name: 'user-lookup-store',
            //storage: createJSONStorage(() => userLookupStorage),
            storage: userLookupStorage,
            onRehydrateStorage: () => (state) => {
                // instead of storing allUsers we can build it from spaceUsers
                for (const spaceId in state?.spaceUsers) {
                    for (const userId in state.spaceUsers[spaceId]) {
                        if (!state.allUsers[userId]) {
                            state.allUsers[userId] = {}
                        }
                        if (!state.allUsers[userId][spaceId]) {
                            state.allUsers[userId][spaceId] = {
                                ...state.spaceUsers[spaceId][userId],
                            }
                        }
                    }
                }
                dlog.info('rehydration complete')
            },
        },
    ),
    shallow,
)

export const userLookupFn = (
    state: UserLookupStore,
    userId: string,
    spaceId: string | undefined,
    channelId: string | undefined,
) => {
    if (channelId && state.channelUsers[channelId]?.[userId]) {
        return state.channelUsers[channelId][userId]
    }

    if (spaceId && state.spaceUsers[spaceId] && state.spaceUsers[spaceId]?.[userId]) {
        return state.spaceUsers[spaceId][userId]
    }

    if (state.fallbackUserLookups[userId]) {
        return state.fallbackUserLookups[userId]
    }

    return undefined
}
