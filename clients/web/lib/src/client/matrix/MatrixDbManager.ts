import { CryptoStore } from 'matrix-js-sdk/lib/crypto/store/base'
import { IndexedDBCryptoStore, IndexedDBStore, Store } from 'matrix-js-sdk'
import { LocalStorageCryptoStore } from 'matrix-js-sdk/lib/crypto/store/localStorage-crypto-store'

export class MatrixDbManager {
    public async getDb(userId: string, deviceId: string): Promise<Store | undefined> {
        const name = `${userId}:${deviceId}`
        let store: Store | undefined
        try {
            const opts = {
                indexedDB: global.indexedDB,
                localStorage: global.localStorage,
                dbName: `matrix-js-sdk:app:${name}`,
            }
            store = new IndexedDBStore(opts)
            await store.startup()
        } catch (e) {
            console.error('couldnt create indexeddb store', e)
        }
        return store
    }

    public getCryptoDb(userId: string): CryptoStore {
        const name = `${userId}`
        let indexedDB: IDBFactory | undefined
        try {
            indexedDB = global.indexedDB
            // eslint-disable-next-line no-empty
        } catch (e) {}
        const store = indexedDB
            ? new IndexedDBCryptoStore(global.indexedDB, `matrix-js-sdk:crypto:${name}`)
            : new LocalStorageCryptoStore(global.localStorage) // note, local storage doesn't support key sharing

        return store
    }
}
