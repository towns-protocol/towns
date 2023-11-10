import { CryptoStore } from './crypto/store/cryptoStore'
import { isTestEnv } from './utils'

export class RiverDbManager {
    public static getCryptoDb(userId: string): CryptoStore {
        if (isTestEnv()) {
            /**
             * TODO: HNT-3569
             * We're using the _same_ database for every user during tests.
             * This is on purpose, or else the tests do not pass. We need to make sure that
             * we have real e2e tests in the sdk. Right now we're relying on sessions being
             * available in the local database, instead of decrypting and parsing toDeviceMessage
             * containing the session info we need.
             */
            return new CryptoStore(`database-`, userId)
        }
        return new CryptoStore(`database-${userId}`, userId)
    }
}
