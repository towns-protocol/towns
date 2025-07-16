import { EncryptedData } from '@towns-protocol/proto'

/**
 * Interface for group event decryption that can be implemented
 * both in-process and in web workers
 */
export interface Decryptor {
    /**
     * Decrypt a group event
     * @param streamId - The stream ID where the encrypted content belongs
     * @param encryptedData - The encrypted data to decrypt
     * @returns The decrypted content as either a string (v0) or Uint8Array (v1)
     */
    decryptGroupEvent(streamId: string, encryptedData: EncryptedData): Promise<Uint8Array | string>

    /**
     * Check if a session key exists for decryption
     * @param streamId - The stream ID
     * @param sessionId - The session ID to check
     * @param algorithm - The encryption algorithm used
     * @returns Whether the session key exists
     */
    hasSessionKey(streamId: string, sessionId: string, algorithm: string): Promise<boolean>

    /**
     * Import session keys for decryption
     * @param streamId - The stream ID
     * @param sessions - Array of session data to import
     */
    importSessionKeys(
        streamId: string,
        sessions: Array<{
            sessionId: string
            sessionKey: Uint8Array
            algorithm: string
        }>,
    ): Promise<void>
}

/**
 * Session data that needs to be passed to workers
 */
export interface DecryptorSession {
    streamId: string
    sessionId: string
    sessionKey: Uint8Array
    algorithm: string
}

/**
 * Options for creating a decryptor
 */
export interface DecryptorOptions {
    /**
     * Maximum number of sessions to cache in memory
     */
    maxCacheSize?: number
}
