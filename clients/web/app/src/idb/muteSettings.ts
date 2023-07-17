import { DBSchema, openDB } from 'idb'
import { idbMethodsFactory } from './utils'

export enum MuteStoreKeys {
    mutedChannels = 'mutedChannels',
    mutedSpaces = 'mutedSpaces',
}

enum StoreNames {
    mutedItems = 'mutedItems',
}

interface KeyvalDB extends DBSchema {
    [StoreNames.mutedItems]: {
        key: 'mutedChannels' | 'mutedSpaces'
        value: Record<string, boolean>
    }
}

const dbPromise = openDB<KeyvalDB>('towns/mute-settings', 1, {
    upgrade(db) {
        db.createObjectStore(StoreNames.mutedItems)
    },
})

export const muteSettings = idbMethodsFactory(dbPromise, StoreNames.mutedItems)
