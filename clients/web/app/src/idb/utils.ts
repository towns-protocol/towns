import {
    DBSchema as IDBPDBSchema,
    IDBPDatabase,
    IndexKey,
    IndexNames,
    StoreKey,
    StoreNames,
    StoreValue,
} from 'idb'

export function idbMethodsFactory<
    Schema extends IDBPDBSchema | unknown,
    Name extends StoreNames<Schema>,
>(dbPromise: Promise<IDBPDatabase<Schema>>, storeName: Name) {
    return {
        async set(value: StoreValue<Schema, Name>, key?: StoreKey<Schema, Name>) {
            const db = await dbPromise
            return db.put(storeName, value, key)
        },
        async get(key: StoreKey<Schema, Name>) {
            const db = await dbPromise
            return db.get(storeName, key)
        },
        async del(key: StoreKey<Schema, Name>) {
            const db = await dbPromise
            return db.delete(storeName, key)
        },
        async clear() {
            const db = await dbPromise
            return db.clear(storeName)
        },
        async keys() {
            const db = await dbPromise
            return db.getAllKeys(storeName)
        },
        async getAll(query?: StoreKey<Schema, Name> | IDBKeyRange | null, count?: number) {
            const db = await dbPromise
            return db.getAll(storeName, query, count)
        },
        async getAllFromIndex<IndexName extends IndexNames<Schema, Name>>(
            indexName: IndexName,
            query?: IndexKey<Schema, Name, IndexName> | IDBKeyRange | null,
            count?: number,
        ) {
            const db = await dbPromise
            return db.getAllFromIndex(storeName, indexName, query, count)
        },
        async transaction<Mode extends IDBTransactionMode = 'readonly'>(mode?: Mode) {
            const db = await dbPromise
            return db.transaction(storeName, mode)
        },
    }
}
