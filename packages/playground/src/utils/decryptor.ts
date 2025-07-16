import type { Pool } from 'workerpool'
import type { Decryptor } from '@towns-protocol/sdk/src/decryption/decryptor'

/**
 * Create a decryptor that runs in a worker pool
 * This follows the same pattern as the unpacker
 */
export const createDecryptorWorkerpool = (pool: Pool): Decryptor => {
    return {
        decryptGroupEvent: (...args: Parameters<Decryptor['decryptGroupEvent']>) =>
            pool.exec('decryptGroupEvent', args),
        hasSessionKey: (...args: Parameters<Decryptor['hasSessionKey']>) =>
            pool.exec('hasSessionKey', args),
        importSessionKeys: (...args: Parameters<Decryptor['importSessionKeys']>) =>
            pool.exec('importSessionKeys', args),
    } satisfies Decryptor
}