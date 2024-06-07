import { persist, PersistStorage, StorageValue } from 'zustand/middleware'
import { immer } from 'zustand/middleware/immer'
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
    setUser: (userId: string, user: LookupUser, spaceId?: string, channelId?: string) => void
    lookupUser: (userId: string, spaceId?: string, channelId?: string) => LookupUser | undefined
}

type OmitFunctions<T> = {
    // eslint-disable-next-line @typescript-eslint/ban-types
    [K in keyof T]: T[K] extends Function ? never : K
}[keyof T]

type UserLookupStoreData = Pick<UserLookupStore, OmitFunctions<UserLookupStore>>

const db = new Dexie('UserLookupDB')
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
        immer((set, get) => ({
            spaceUsers: {},
            channelUsers: {},
            fallbackUserLookups: {},
            allUsers: {},
            setUser: (userId, user, spaceId, channelId) => {
                set((state) => {
                    if (spaceId) {
                        if (!state.allUsers[userId]) {
                            state.allUsers[userId] = {}
                        }
                        if (!state.allUsers[userId][spaceId]) {
                            state.allUsers[userId][spaceId] = user
                        }
                    }

                    const memberOf = state.allUsers[userId]

                    if (channelId) {
                        if (!state.channelUsers[channelId]) {
                            state.channelUsers[channelId] = {}
                        }
                        state.channelUsers[channelId][userId] = {
                            ...user,
                            memberOf,
                        }
                    }

                    if (spaceId) {
                        if (!state.spaceUsers[spaceId]) {
                            state.spaceUsers[spaceId] = {}
                        }
                        state.spaceUsers[spaceId][userId] = {
                            ...user,
                            memberOf,
                        }

                        state.fallbackUserLookups[userId] = { ...user, memberOf }
                    }
                })
            },
            lookupUser: (userId, spaceId, channelId) => {
                const state = get()

                if (
                    channelId &&
                    state.channelUsers[channelId] &&
                    state.channelUsers[channelId][userId]
                ) {
                    const channelSpecific = state.channelUsers[channelId][userId]
                    return { ...channelSpecific, memberOf: state.allUsers[userId] }
                }
                if (spaceId && state.spaceUsers[spaceId] && state.spaceUsers[spaceId][userId]) {
                    const spaceSpecific = state.spaceUsers[spaceId][userId]
                    return spaceSpecific
                }
                if (state.fallbackUserLookups[userId]) {
                    const fallback = state.fallbackUserLookups[userId]
                    return fallback
                }

                dlog.info('lookupUser not found', userId, spaceId, channelId, state)
                return undefined
            },
        })),
        {
            name: 'user-lookup-store',
            //storage: createJSONStorage(() => userLookupStorage),
            storage: userLookupStorage,
            onRehydrateStorage: () => (_state) => {
                dlog.info('rehydration complete')
            },
        },
    ),
    shallow,
)
