import { CryptoStore } from './crypto/store/cryptoStore'

export class RiverDbManager {
    public static getCryptoDb(userId: string): CryptoStore {
        return new CryptoStore(`database-${userId}`, userId)
    }
}
