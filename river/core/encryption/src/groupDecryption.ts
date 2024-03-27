import type { GroupSessionExtraData } from './encryptionDevice'

import { DecryptionAlgorithm, DecryptionError, IDecryptionParams } from './base'
import { GroupEncryptionSession } from './olmLib'
import { EncryptedData } from '@river-build/proto'
import { dlog } from '@river-build/dlog'

const log = dlog('csb:encryption:groupDecryption')

/**
 * Group decryption implementation
 *
 * @param params - parameters, as per {@link DecryptionAlgorithm}
 */
export class GroupDecryption extends DecryptionAlgorithm {
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
        if (!content.senderKey || !content.sessionId || !content.ciphertext) {
            throw new DecryptionError('GROUP_DECRYPTION_MISSING_FIELDS', 'Missing fields in input')
        }

        const { session } = await this.device.getInboundGroupSession(streamId, content.sessionId)

        if (!session) {
            throw new Error('Session not found')
        }

        const result = session.decrypt(content.ciphertext)
        return result.plaintext
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
}
