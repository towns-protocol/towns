import { createCryptoStore, CryptoStore } from '@towns-protocol/encryption'

export class RiverDbManager {
    public static getCryptoDb(userId: string, dbName?: string): CryptoStore {
        return createCryptoStore(dbName ?? `database-${userId}`, userId)
    }
}
