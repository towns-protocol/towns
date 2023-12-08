import { CryptoStore } from './crypto/store/cryptoStore'

export class RiverDbManager {
    public static getCryptoDb(userId: string, dbName?: string): CryptoStore {
        return new CryptoStore(dbName ?? `database-${userId}`, userId)
    }
}
