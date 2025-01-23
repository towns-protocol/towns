import type { GroupSessionExtraData } from './encryptionDevice'

import { DecryptionAlgorithm, DecryptionError, IDecryptionParams } from './base'
import { GroupEncryptionAlgorithmId, GroupEncryptionSession } from './olmLib'
import { EncryptedData, EncryptedDataVersion } from '@river-build/proto'
import { bin_fromBase64, dlog } from '@river-build/dlog'

const log = dlog('csb:encryption:groupDecryption')

/**
 * Group decryption implementation
 *
 * @param params - parameters, as per {@link DecryptionAlgorithm}
 */
export class GroupDecryption extends DecryptionAlgorithm {
    public readonly algorithm = GroupEncryptionAlgorithmId.GroupEncryption
    public constructor(params: IDecryptionParams) {
        super(params)
    }

    /**
     * returns a promise which resolves to a
     * {@link EventDecryptionResult} once we have finished
     * decrypting, or rejects with an `algorithms.DecryptionError` if there is a
     * problem decrypting the event.
     */
    public async decrypt(streamId: string, content: EncryptedData): Promise<Uint8Array | string> {
        if (!content.senderKey || !content.sessionId || !content.ciphertext) {
            throw new DecryptionError('GROUP_DECRYPTION_MISSING_FIELDS', 'Missing fields in input')
        }

        const { session } = await this.device.getInboundGroupSession(streamId, content.sessionId)

        if (!session) {
            throw new Error('Session not found')
        }

        // for historical reasons, we return the plaintext as a string
        const result = session.decrypt(content.ciphertext)

        switch (content.version) {
            case EncryptedDataVersion.ENCRYPTED_DATA_VERSION_0:
                return result.plaintext
            case EncryptedDataVersion.ENCRYPTED_DATA_VERSION_1:
                return bin_fromBase64(result.plaintext)

            default:
                throw new DecryptionError('GROUP_DECRYPTION_INVALID_VERSION', 'Unsupported version')
        }
    }

    /**
     * @param streamId - the stream id of the session
     * @param session- the group session object
     */
    public async importStreamKey(streamId: string, session: GroupEncryptionSession): Promise<void> {
        const extraSessionData: GroupSessionExtraData = {}
        try {
            await this.device.addInboundGroupSession(
                streamId,
                session.sessionId,
                session.sessionKey,
                // sender claimed keys not yet supported
                {} as Record<string, string>,
                false,
                extraSessionData,
            )
        } catch (e) {
            log(`Error handling room key import: ${(<Error>e).message}`)
        }
    }

    /** */
    public async exportGroupSession(
        streamId: string,
        sessionId: string,
    ): Promise<GroupEncryptionSession | undefined> {
        return this.device.exportInboundGroupSession(streamId, sessionId)
    }

    /** */
    public exportGroupSessions(): Promise<GroupEncryptionSession[]> {
        return this.device.exportInboundGroupSessions()
    }

    /** */
    public exportGroupSessionIds(streamId: string): Promise<string[]> {
        return this.device.getInboundGroupSessionIds(streamId)
    }

    /** */
    public async hasSessionKey(streamId: string, sessionId: string): Promise<boolean> {
        return this.device.hasInboundSessionKeys(streamId, sessionId)
    }
}
