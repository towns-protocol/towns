import { EncryptedData, EncryptedDataVersion } from '@towns-protocol/proto'
import { bin_toHexString } from '@towns-protocol/dlog'
import {
    parseGroupEncryptionAlgorithmId,
    GroupEncryptionAlgorithmId,
    decryptAesGcm,
    importAesGsmKeyBytes,
} from '@towns-protocol/encryption'
import { Decryptor, DecryptorOptions } from './decryptor'

// Simple LRU cache for session keys
class LRUCache<K, V> {
    private cache = new Map<K, V>()
    private maxSize: number

    constructor(maxSize: number = 100) {
        this.maxSize = maxSize
    }

    get(key: K): V | undefined {
        const value = this.cache.get(key)
        if (value !== undefined) {
            // Move to end (most recently used)
            this.cache.delete(key)
            this.cache.set(key, value)
        }
        return value
    }

    set(key: K, value: V): void {
        if (this.cache.has(key)) {
            this.cache.delete(key)
        } else if (this.cache.size >= this.maxSize) {
            // Remove least recently used (first item)
            const firstKey = this.cache.keys().next().value
            if (firstKey) {
                this.cache.delete(firstKey)
            }
        }
        this.cache.set(key, value)
    }

    clear(): void {
        this.cache.clear()
    }
}

interface SessionStore {
    streamId: string
    sessionId: string
    sessionKey: Uint8Array
    algorithm: GroupEncryptionAlgorithmId
}

// Create a composite key that includes the algorithm
function makeSessionKey(
    streamId: string,
    sessionId: string,
    algorithm: GroupEncryptionAlgorithmId,
): string {
    return `${streamId}:${sessionId}:${algorithm}`
}

class DecryptionError extends Error {
    constructor(
        public code: string,
        message: string,
    ) {
        super(message)
        this.name = 'DecryptionError'
    }
}

/**
 * Create a decryptor instance that can run in workers or main thread
 *
 * NOTE: This implementation currently only supports HybridGroupEncryption (AES-GCM).
 * Full Olm support would require:
 * 1. Loading the Olm library in the worker
 * 2. Serializing/deserializing InboundGroupSession objects
 * 3. Managing Olm session state across worker boundaries
 *
 * For production use with Olm support, consider:
 * - Using the main thread crypto backend for Olm decryption
 * - Only offloading AES-GCM operations to workers
 * - Or implementing a hybrid approach where session management stays on main thread
 */
export function createDecryptor(options: DecryptorOptions = { maxCacheSize: 100 }): Decryptor {
    // Session storage - in a real implementation, this would be backed by IndexedDB
    const sessions = new Map<string, SessionStore>()
    const sessionCache = new LRUCache<string, SessionStore>(options.maxCacheSize)

    async function decryptGroupEvent(
        streamId: string,
        content: EncryptedData,
    ): Promise<Uint8Array | string> {
        // Parse the algorithm
        const algorithm = parseGroupEncryptionAlgorithmId(content.algorithm)
        if (algorithm.kind === 'unrecognized') {
            throw new DecryptionError('GROUP_DECRYPTION_UNKNOWN_ALGORITHM', content.algorithm)
        }

        switch (algorithm.value) {
            case GroupEncryptionAlgorithmId.HybridGroupEncryption:
                return decryptHybrid(streamId, content)

            case GroupEncryptionAlgorithmId.GroupEncryption:
                // Olm-based decryption would require significant setup:
                // 1. Initialize Olm library in worker context
                // 2. Manage InboundGroupSession objects
                // 3. Handle session serialization/deserialization
                throw new DecryptionError(
                    'GROUP_DECRYPTION_NOT_SUPPORTED',
                    'Olm decryption not supported in worker. Use main thread crypto backend for Olm.',
                )

            default:
                throw new DecryptionError(
                    'GROUP_DECRYPTION_UNKNOWN_ALGORITHM',
                    `Unknown algorithm: ${algorithm}`,
                )
        }
    }

    async function decryptHybrid(
        streamId: string,
        content: EncryptedData,
    ): Promise<Uint8Array | string> {
        if (
            !content.senderKey ||
            !content.sessionIdBytes ||
            !content.ciphertextBytes ||
            !content.ivBytes
        ) {
            throw new DecryptionError(
                'HYBRID_GROUP_DECRYPTION_MISSING_FIELDS',
                'Missing fields in input',
            )
        }

        const sessionId = bin_toHexString(content.sessionIdBytes)
        const cacheKey = makeSessionKey(
            streamId,
            sessionId,
            GroupEncryptionAlgorithmId.HybridGroupEncryption,
        )

        // Check cache first
        let session = sessionCache.get(cacheKey)

        // If not in cache, fetch from storage
        if (!session) {
            session = sessions.get(cacheKey)
            if (!session) {
                throw new DecryptionError(
                    'HYBRID_GROUP_DECRYPTION_MISSING_SESSION',
                    'Missing session',
                )
            }
            sessionCache.set(cacheKey, session)
        }

        // Decrypt using Web Crypto API
        const key = await importAesGsmKeyBytes(session.sessionKey)
        const result = await decryptAesGcm(key, content.ciphertextBytes, content.ivBytes)

        // Return based on version
        switch (content.version) {
            case EncryptedDataVersion.ENCRYPTED_DATA_VERSION_0:
                return new TextDecoder().decode(result)
            case EncryptedDataVersion.ENCRYPTED_DATA_VERSION_1:
                return result
            default:
                throw new DecryptionError('GROUP_DECRYPTION_INVALID_VERSION', 'Unsupported version')
        }
    }

    async function hasSessionKey(
        streamId: string,
        sessionId: string,
        algorithm: string,
    ): Promise<boolean> {
        const parsedAlgorithm = parseGroupEncryptionAlgorithmId(algorithm)
        if (parsedAlgorithm.kind === 'unrecognized') {
            return false
        }
        const cacheKey = makeSessionKey(streamId, sessionId, parsedAlgorithm.value)
        return sessions.has(cacheKey)
    }

    async function importSessionKeys(
        streamId: string,
        sessionList: Array<{
            sessionId: string
            sessionKey: Uint8Array
            algorithm: string
        }>,
    ): Promise<void> {
        for (const session of sessionList) {
            const algorithm = parseGroupEncryptionAlgorithmId(session.algorithm)
            if (algorithm.kind === 'unrecognized') {
                continue
            }

            const cacheKey = makeSessionKey(streamId, session.sessionId, algorithm.value)
            sessions.set(cacheKey, {
                streamId,
                sessionId: session.sessionId,
                sessionKey: session.sessionKey,
                algorithm: algorithm.value,
            })
        }
    }

    return {
        decryptGroupEvent,
        hasSessionKey,
        importSessionKeys,
    }
}
