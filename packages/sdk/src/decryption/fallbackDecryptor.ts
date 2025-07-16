import { EncryptedData } from '@towns-protocol/proto'
import {
    GroupEncryptionCrypto,
    parseGroupEncryptionAlgorithmId,
    GroupEncryptionAlgorithmId,
} from '@towns-protocol/encryption'
import { Decryptor } from './decryptor'

/**
 * Interface for a fallback-capable decryptor
 */
export interface FallbackDecryptor extends Decryptor {
    setMainThreadCrypto(crypto: GroupEncryptionCrypto): void
}

/**
 * A fallback-capable hybrid decryptor that:
 * - Routes AES-GCM operations to workers for performance
 * - Falls back to main thread if worker fails (e.g., missing session)
 * - Always uses main thread for Olm operations
 * - Can be initialized before crypto backend is ready
 */
export class FallbackHybridDecryptor implements FallbackDecryptor {
    private mainThreadCrypto?: GroupEncryptionCrypto

    constructor(
        private workerDecryptor: Decryptor,
        mainThreadCrypto?: GroupEncryptionCrypto,
    ) {
        this.mainThreadCrypto = mainThreadCrypto
    }

    /**
     * Set the main thread crypto backend after initialization
     * This allows creating the decryptor before crypto is ready
     */
    setMainThreadCrypto(crypto: GroupEncryptionCrypto): void {
        this.mainThreadCrypto = crypto
    }

    async decryptGroupEvent(
        streamId: string,
        encryptedData: EncryptedData,
    ): Promise<Uint8Array | string> {
        const algorithm = parseGroupEncryptionAlgorithmId(encryptedData.algorithm)

        // Handle AES-GCM with worker + fallback
        if (
            algorithm.kind === 'matched' &&
            algorithm.value === GroupEncryptionAlgorithmId.HybridGroupEncryption
        ) {
            try {
                // Try worker first for performance
                return await this.workerDecryptor.decryptGroupEvent(streamId, encryptedData)
            } catch (error) {
                // Fall back to main thread if worker fails
                if (this.mainThreadCrypto) {
                    console.debug('Worker decryption failed, falling back to main thread:', error)
                    return this.mainThreadCrypto.decryptGroupEvent(streamId, encryptedData)
                }
                // Re-throw if no fallback available
                throw error
            }
        }

        // Use main thread for Olm
        if (!this.mainThreadCrypto) {
            throw new Error(
                'Main thread crypto not available. ' +
                    'Call setMainThreadCrypto() after crypto initialization.',
            )
        }
        return this.mainThreadCrypto.decryptGroupEvent(streamId, encryptedData)
    }

    async hasSessionKey(streamId: string, sessionId: string, algorithm: string): Promise<boolean> {
        const parsedAlg = parseGroupEncryptionAlgorithmId(algorithm)

        // For AES-GCM, check worker first
        if (
            parsedAlg.kind === 'matched' &&
            parsedAlg.value === GroupEncryptionAlgorithmId.HybridGroupEncryption
        ) {
            try {
                const workerHas = await this.workerDecryptor.hasSessionKey(
                    streamId,
                    sessionId,
                    algorithm,
                )
                if (workerHas) return true
            } catch (error) {
                console.debug('Worker hasSessionKey failed:', error)
            }
        }

        // Check main thread
        if (this.mainThreadCrypto) {
            return this.mainThreadCrypto.hasSessionKey(
                streamId,
                sessionId,
                algorithm as GroupEncryptionAlgorithmId,
            )
        }

        return false
    }

    async importSessionKeys(
        streamId: string,
        sessions: Array<{
            sessionId: string
            sessionKey: Uint8Array
            algorithm: string
        }>,
    ): Promise<void> {
        // Import AES-GCM sessions to worker for performance
        const hybridSessions = sessions.filter((s) => {
            const alg = parseGroupEncryptionAlgorithmId(s.algorithm)
            return (
                alg.kind === 'matched' &&
                alg.value === GroupEncryptionAlgorithmId.HybridGroupEncryption
            )
        })

        if (hybridSessions.length > 0) {
            try {
                await this.workerDecryptor.importSessionKeys(streamId, hybridSessions)
            } catch (error) {
                console.warn('Failed to import session keys to worker:', error)
                // Sessions will still be available via main thread
            }
        }

        // Olm sessions are handled by main thread crypto backend
    }
}

/**
 * Create a fallback-capable hybrid decryptor
 */
export function createFallbackDecryptor(
    workerDecryptor: Decryptor,
    mainThreadCrypto?: GroupEncryptionCrypto,
): FallbackDecryptor {
    return new FallbackHybridDecryptor(workerDecryptor, mainThreadCrypto)
}
