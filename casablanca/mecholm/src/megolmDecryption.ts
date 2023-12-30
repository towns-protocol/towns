import type { OlmGroupSessionExtraData } from './olmDevice'

import { DecryptionAlgorithm, DecryptionError, IDecryptionParams } from './base'
import { MegolmSession } from './olmLib'
import { EncryptedData } from '@river/proto'
import { dlog } from './dlog'

const log = dlog('csb:megolm:decryption')

/**
 * Megolm decryption implementation
 *
 * @param params - parameters, as per {@link DecryptionAlgorithm}
 */
export class MegolmDecryption extends DecryptionAlgorithm {
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
            throw new DecryptionError('MEGOLM_MISSING_FIELDS', 'Missing fields in input')
        }

        const { session } = await this.olmDevice.getInboundGroupSession(streamId, content.sessionId)

        if (!session) {
            throw new Error('Session not found')
        }

        const result = session.decrypt(content.ciphertext)
        return result.plaintext
    }

    /**
     * @param streamId - the stream id of the session
     * @param session- the megolm session object
     */
    public async importStreamKey(streamId: string, session: MegolmSession): Promise<void> {
        const extraSessionData: OlmGroupSessionExtraData = {}
        try {
            await this.olmDevice.addInboundGroupSession(
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
