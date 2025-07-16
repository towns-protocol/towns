import { EncryptedData } from '@towns-protocol/proto'
import {
    GroupEncryptionCrypto,
    parseGroupEncryptionAlgorithmId,
    GroupEncryptionAlgorithmId,
} from '@towns-protocol/encryption'
import { Decryptor } from './decryptor'

/**
 * A hybrid decryptor that routes decryption operations based on algorithm:
 * - AES-GCM (HybridGroupEncryption) operations go to workers
 * - Olm (GroupEncryption) operations stay on main thread
 *
 * This provides the best of both worlds:
 * - CPU-intensive AES-GCM operations don't block the main thread
 * - Olm operations continue to work without complex serialization
 */
export class HybridDecryptor implements Decryptor {
    constructor(
        private workerDecryptor: Decryptor,
        private mainThreadCrypto: GroupEncryptionCrypto,
    ) {}

    async decryptGroupEvent(
        streamId: string,
        encryptedData: EncryptedData,
    ): Promise<Uint8Array | string> {
        // Parse the algorithm to determine routing
        const algorithm = parseGroupEncryptionAlgorithmId(encryptedData.algorithm)

        if (
            algorithm.kind === 'matched' &&
            algorithm.value === GroupEncryptionAlgorithmId.HybridGroupEncryption
        ) {
            // Route AES-GCM decryption to workers
            return this.workerDecryptor.decryptGroupEvent(streamId, encryptedData)
        }

        // Fall back to main thread for Olm or unknown algorithms
        return this.mainThreadCrypto.decryptGroupEvent(streamId, encryptedData)
    }

    async hasSessionKey(streamId: string, sessionId: string, algorithm: string): Promise<boolean> {
        // Check both worker and main thread storage
        const [workerHas, mainHas] = await Promise.all([
            this.workerDecryptor.hasSessionKey(streamId, sessionId, algorithm),
            this.mainThreadCrypto.hasSessionKey(
                streamId,
                sessionId,
                algorithm as GroupEncryptionAlgorithmId,
            ),
        ])

        return workerHas || mainHas
    }

    async importSessionKeys(
        streamId: string,
        sessions: Array<{
            sessionId: string
            sessionKey: Uint8Array
            algorithm: string
        }>,
    ): Promise<void> {
        // Separate sessions by algorithm
        const hybridSessions = sessions.filter((s) => {
            const alg = parseGroupEncryptionAlgorithmId(s.algorithm)
            return (
                alg.kind === 'matched' &&
                alg.value === GroupEncryptionAlgorithmId.HybridGroupEncryption
            )
        })

        // Import hybrid sessions to worker
        if (hybridSessions.length > 0) {
            await this.workerDecryptor.importSessionKeys(streamId, hybridSessions)
        }

        // Note: Olm sessions are handled by the main thread crypto backend
        // through the existing decryption extensions flow
    }
}

/**
 * Create a hybrid decryptor that intelligently routes operations
 */
export function createHybridDecryptor(
    workerDecryptor: Decryptor,
    mainThreadCrypto: GroupEncryptionCrypto,
): Decryptor {
    return new HybridDecryptor(workerDecryptor, mainThreadCrypto)
}
