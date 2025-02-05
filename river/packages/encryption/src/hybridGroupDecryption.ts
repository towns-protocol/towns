import { DecryptionAlgorithm, DecryptionError, IDecryptionParams } from './base'
import { GroupEncryptionAlgorithmId, GroupEncryptionSession } from './olmLib'
import { EncryptedData, EncryptedDataVersion, HybridGroupSessionKey } from '@river-build/proto'
import { bin_toHexString, dlogError } from '@river-build/dlog'
import { decryptAesGcm, importAesGsmKeyBytes } from './cryptoAesGcm'
import { LRUCache } from 'lru-cache'

const logError = dlogError('csb:encryption:groupDecryption')

/**
 * Group decryption implementation
 *
 * @param params - parameters, as per {@link DecryptionAlgorithm}
 */
export class HybridGroupDecryption extends DecryptionAlgorithm {
    public readonly algorithm = GroupEncryptionAlgorithmId.HybridGroupEncryption
    private lruCache: LRUCache<string, HybridGroupSessionKey>
    public constructor(params: IDecryptionParams) {
        super(params)
        this.lruCache = new LRUCache<string, HybridGroupSessionKey>({ max: 1000 })
    }

    /**
     * returns a promise which resolves to a
     * {@link EventDecryptionResult} once we have finished
     * decrypting, or rejects with an `algorithms.DecryptionError` if there is a
     * problem decrypting the event.
     */
    public async decrypt(streamId: string, content: EncryptedData): Promise<Uint8Array | string> {
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

        // Check cache first
        let session = this.lruCache.get(sessionId)

        // If not in cache, fetch from device
        if (!session) {
            session = await this.device.getHybridGroupSessionKey(streamId, sessionId)
            if (!session) {
                throw new DecryptionError(
                    'HYBRID_GROUP_DECRYPTION_MISSING_SESSION',
                    'Missing session',
                )
            }
            this.lruCache.set(sessionId, session)
        }

        const key = await importAesGsmKeyBytes(session.key)
        const result = await decryptAesGcm(key, content.ciphertextBytes, content.ivBytes)

        switch (content.version) {
            case EncryptedDataVersion.ENCRYPTED_DATA_VERSION_0:
                return new TextDecoder().decode(result)
            case EncryptedDataVersion.ENCRYPTED_DATA_VERSION_1:
                return result
            default:
                throw new DecryptionError('GROUP_DECRYPTION_INVALID_VERSION', 'Unsupported version')
        }
    }

    /**
     * @param streamId - the stream id of the session
     * @param session- the group session object
     */
    public async importStreamKey(streamId: string, session: GroupEncryptionSession): Promise<void> {
        try {
            await this.device.addHybridGroupSession(streamId, session.sessionId, session.sessionKey)
        } catch (e) {
            logError(`Error handling room key import: ${(<Error>e).message}`)
            throw e
        }
    }

    /** */
    public async exportGroupSession(
        streamId: string,
        sessionId: string,
    ): Promise<GroupEncryptionSession | undefined> {
        return this.device.exportHybridGroupSession(streamId, sessionId)
    }

    /** */
    public exportGroupSessions(): Promise<GroupEncryptionSession[]> {
        return this.device.exportHybridGroupSessions()
    }

    /** */
    public exportGroupSessionIds(streamId: string): Promise<string[]> {
        return this.device.getHybridGroupSessionIds(streamId)
    }

    public async hasSessionKey(streamId: string, sessionId: string): Promise<boolean> {
        return this.device.hasHybridGroupSessionKey(streamId, sessionId)
    }
}
