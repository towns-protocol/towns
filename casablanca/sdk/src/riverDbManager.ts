import { dlog } from './dlog'
import { CryptoStore } from './crypto/store/base'
import { LocalStorageCryptoStore } from './crypto/store/local-storage-crypto-store'
import { IndexedDBCryptoStore } from './crypto/store/indexeddb-crypto-store'
const log = dlog('csb:riverDbManager')

export class RiverDbManager {
    public static getCryptoDb(userId: string): CryptoStore {
        const name = `${userId}`
        let indexedDB: IDBFactory | undefined
        try {
            indexedDB = global.indexedDB
        } catch (e) {
            log('indexedb store doesnt exist yet', e)
        }
        const store = indexedDB
            ? new IndexedDBCryptoStore(global.indexedDB, `river-sdk:crypto:${name}`, userId)
            : new LocalStorageCryptoStore(global.localStorage, userId) // note, local storage doesn't support key sharing
        return store
    }
}
