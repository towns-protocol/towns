import { DBSchema, openDB } from 'idb'
import { idbMethodsFactory } from './utils'

type Space = {
    id: string
    name: string
}

type Channel = {
    parentSpaceId: string
    id: string
    name: string
}

type User = {
    id: string
    name: string
}

enum StoreNames {
    spaces = 'spaces',
    channels = 'channels',
    users = 'users',
}

interface CacheDB extends DBSchema {
    [StoreNames.spaces]: {
        key: string
        value: Space
    }
    [StoreNames.channels]: {
        key: string
        value: Channel
        indexes: { bySpace: string }
    }
    [StoreNames.users]: {
        key: string
        value: User
        indexes: { bySpace: string }
    }
}

const CACHE_DB = 'towns/notifications-meta'
const VERSION = 2

export const startDB = ({ onTerminated }: { onTerminated?: () => void } = {}) => {
    const dbPromise = openDB<CacheDB>(CACHE_DB, VERSION, {
        // this is going to be called if VERSION changes
        upgrade(db, oldVersion, _newVersion, _transaction) {
            switch (oldVersion) {
                case 0: {
                    db.createObjectStore(StoreNames.spaces, {
                        keyPath: 'id',
                    })
                    const channelStore = db.createObjectStore(StoreNames.channels, {
                        keyPath: 'id',
                    })
                    channelStore.createIndex('bySpace', 'parentSpaceId')
                    db.createObjectStore(StoreNames.users, {
                        keyPath: 'id',
                    })
                }
            }
        },
        // vite-plugin-pwa refreshes all connected tabs automatically so this should not be needed
        blocked(_currentVersion, _blockedVersion, _event) {
            void 0
        },
        // vite-plugin-pwa refreshes all connected tabs automatically so this should not be needed
        blocking(_currentVersion, _blockingVersion, _event) {
            void 0
        },
        // not when db.closed, but if "browser abnormally terminates the connection". If DB is erased this is called
        terminated() {
            onTerminated?.()
        },
    })
    const idbChannels = idbMethodsFactory(dbPromise, StoreNames.channels)
    const idbSpaces = idbMethodsFactory(dbPromise, StoreNames.spaces)
    const idbUsers = idbMethodsFactory(dbPromise, StoreNames.users)
    return { idbChannels, idbSpaces, idbUsers }
}
