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
    id: never
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
    }
}

const CACHE_DB = 'towns/notifications-meta'
const VERSION = 1

const dbPromise = openDB<CacheDB>(CACHE_DB, VERSION, {
    upgrade(db) {
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
    },
})

export const channels = idbMethodsFactory(dbPromise, StoreNames.channels)
export const spaces = idbMethodsFactory(dbPromise, StoreNames.spaces)
