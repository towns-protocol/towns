import { DecryptionAlgorithm, DecryptionError, IDecryptionParams } from './base'
import { GroupEncryptionAlgorithmId, GroupEncryptionSession } from './olmLib'
import { EncryptedData, HybridGroupSessionKey } from '@river-build/proto'
import { bin_toHexString, dlog } from '@river-build/dlog'
import { decryptAesGcm, importAesGsmKeyBytes } from './cryptoAesGcm'

const log = dlog('csb:encryption:groupDecryption')

/**
 * Group decryption implementation
 *
 * @param params - parameters, as per {@link DecryptionAlgorithm}
 */
export class HybridGroupDecryption extends DecryptionAlgorithm {
    public readonly algorithm = GroupEncryptionAlgorithmId.HybridGroupEncryption
    public constructor(params: IDecryptionParams) {
        super(params)
    }

    /**
     * returns a promise which resolves to a
     * {@link EventDecryptionResult} once we have finished
     * decrypting, or rejects with an `algorithms.DecryptionError` if there is a
     * problem decrypting the event.
     */
    public async decrypt(streamId: string, content: EncryptedData): Promise<string> {
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

        const session: HybridGroupSessionKey = await this.device.getHybridGroupSessionKey(
            streamId,
            sessionId,
        )

        const key = await importAesGsmKeyBytes(session.key)
        const result = await decryptAesGcm(key, content.ciphertextBytes, content.ivBytes)
        return new TextDecoder().decode(result) // TODO: what kind of string is actually expected here? TODO: convert to Uint8Array
    }

    /**
     * @param streamId - the stream id of the session
     * @param session- the group session object
     */
    public async importStreamKey(streamId: string, session: GroupEncryptionSession): Promise<void> {
        try {
            await this.device.addHybridGroupSession(streamId, session.sessionId, session.sessionKey)
        } catch (e) {
            log(`Error handling room key import: ${(<Error>e).message}`)
        }
    }

    /** */
    public async exportGroupSession(
        streamId: string,
        sessionId: string,
    ): Promise<GroupEncryptionSession | undefined> {
        return this.device.exportHybridGroupSession(streamId, sessionId, this.algorithm)
    }

    /** */
    public exportGroupSessions(): Promise<GroupEncryptionSession[]> {
        return this.device.exportHybridGroupSessions(this.algorithm)
    }

    /** */
    public exportGroupSessionIds(streamId: string): Promise<string[]> {
        return this.device.getHybridGroupSessionIds(streamId)
    }

    public async hasSessionKey(streamId: string, sessionId: string): Promise<boolean> {
        return this.device.hasHybridGroupSessionKey(streamId, sessionId)
    }
}
