import { persist, PersistStorage, StorageValue } from 'zustand/middleware'
import debounce from 'lodash/debounce'
import Dexie from 'dexie'
import { LookupUser } from 'types/user-lookup'
import { shallow } from 'zustand/shallow'

import { dlogger } from '@river-build/dlog'
import { createWithEqualityFn } from 'zustand/traditional'
import isEqual from 'lodash/isEqual'

const dlog = dlogger('csb:store:user-lookup')

type UserLookupStore = {
    spaceUsers: Record<string, Record<string, LookupUser>>
    channelUsers: Record<string, Record<string, LookupUser>> // for DM and GDM channels
    fallbackUserLookups: Record<string, LookupUser>
    allUsers: Record<string, Record<string, LookupUser>>
    setSpaceUser: (userId: string, user: LookupUser, spaceId?: string) => void
    setSpaceUsers: (records: { userId: string; user: LookupUser; spaceId?: string }[]) => void
    setChannelUser: (userId: string, user: LookupUser, channelId?: string) => void
    setChannelUsers: (records: { userId: string; user: LookupUser; channelId?: string }[]) => void
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
        const spaceUsers = value.state.spaceUsers
        const channelUsers = value.state.channelUsers
        const fallbackUserLookups = value.state.fallbackUserLookups
        const allUsers = value.state.allUsers
        try {
            await db
                .table('userLookup')
                .put({ key: name, spaceUsers, channelUsers, fallbackUserLookups, allUsers })
        } catch (e) {
            dlog.error(`problem saving to persistence`, e)
        }
    },
    1000,
    { maxWait: 5000 },
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

function setSpaceUser(
    state: UserLookupStore,
    userId: string,
    user: LookupUser,
    spaceId?: string,
): UserLookupStore {
    const { allUsers, spaceUsers, fallbackUserLookups } = state
    if (!spaceId) {
        return state
    }

    // avoid mutation if user === stored users in all places
    // this occurs a lot during initialization while unrolling
    // streams upon persisted state
    if (
        allUsers[userId] &&
        spaceUsers[spaceId]?.[userId] &&
        fallbackUserLookups[userId] &&
        isEqual(allUsers[userId][spaceId], user) &&
        isEqual(spaceUsers[spaceId][userId], user) &&
        isEqual(fallbackUserLookups[userId], user)
    ) {
        return state
    }

    const newAllUsers = { ...allUsers }
    if (!newAllUsers[userId]) {
        newAllUsers[userId] = {}
    }
    newAllUsers[userId] = {
        ...newAllUsers[userId],
        [spaceId]: { ...user },
    }

    const newSpaceUsers = { ...spaceUsers }
    if (!newSpaceUsers[spaceId]) {
        newSpaceUsers[spaceId] = {}
    }
    newSpaceUsers[spaceId] = {
        ...newSpaceUsers[spaceId],
        [userId]: { ...user },
    }

    const newFallbackUserLookups = { ...fallbackUserLookups }
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

function setChannelUser(
    state: UserLookupStore,
    userId: string,
    user: LookupUser,
    channelId?: string,
): UserLookupStore {
    if (!channelId) {
        return state
    }

    if (state.channelUsers[channelId] && isEqual(state.channelUsers[channelId], user)) {
        return state
    }
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

export const useUserLookupStore = createWithEqualityFn<UserLookupStore>()(
    persist(
        (set, get) => ({
            spaceUsers: {},
            channelUsers: {},
            fallbackUserLookups: {},
            allUsers: {},
            setSpaceUser: (userId, user, spaceId) => {
                set((state) => {
                    return setSpaceUser(state, userId, user, spaceId)
                })
            },
            setSpaceUsers: (records) => {
                set((state) => {
                    for (const record of records) {
                        state = setSpaceUser(state, record.userId, record.user, record.spaceId)
                    }
                    return state
                })
            },
            setChannelUser: (userId, user, channelId) => {
                set((state) => {
                    return setChannelUser(state, userId, user, channelId)
                })
            },
            setChannelUsers: (records) => {
                set((state) => {
                    for (const record of records) {
                        state = setChannelUser(state, record.userId, record.user, record.channelId)
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
            storage: userLookupStorage,
            partialize: (state) => {
                const { allUsers, channelUsers, spaceUsers, fallbackUserLookups } = state
                return {
                    allUsers,
                    channelUsers,
                    spaceUsers,
                    fallbackUserLookups,
                }
            },
            onRehydrateStorage: () => {
                return (_state, error) => {
                    if (error) {
                        dlog.error('an error happened during hydration', error)
                    } else {
                        dlog.info('rehydration complete')
                    }
                }
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
