import { EncryptedData } from '@river/proto'
import { PlainMessage } from '@bufbuild/protobuf'
import { EncryptionAlgorithm, IEncryptionParams } from './base'
import { MEGOLM_ALGORITHM } from './olmLib'
import { dlog } from './dlog'

const log = dlog('csb:megolm:encryption')

/** Note Jterzis 07/26/23: Several features are intentionally left out of this module,
 * that we may want to implement in the future:
 * 1. Shared History - We don't have a concept of "shared history visibility settings" in River.
 * 2. Backup Manager - We do not backup session keys to anything other than client-side storage.
 * 3. Blocking Devices - We do not block devices and therefore do not account for blocked devices here.
 * 4. Key Forwarding - River does not support key forwarding sessions created by another user's device.
 * 5. Cross Signing - River does not support cross signing yet. Each device is verified individually at this time.
 * 6. Sessions Rotation - River does not support active or periodic session rotation yet.
 */

/**
 * Megolm encryption implementation
 *
 * @param params - parameters, as per {@link EncryptionAlgorithm}
 */
export class MegolmEncryption extends EncryptionAlgorithm {
    public constructor(params: IEncryptionParams) {
        super(params)
    }

    private async ensureOutboundSession(streamId: string): Promise<void> {
        try {
            await this.olmDevice.getOutboundGroupSessionKey(streamId)
            return
        } catch (error) {
            // if we don't have a cached session at this point, create a new one
            const sessionId = await this.olmDevice.createOutboundGroupSession(streamId)
            log(`Started new megolm session ${sessionId}`)
            // don't wait for the session to be shared
            void this.shareSession(streamId, sessionId)
        }
    }

    private async shareSession(streamId: string, sessionId: string): Promise<void> {
        const devicesInRoom = await this.client.getDevicesInStream(streamId)
        const session = await this.olmDevice.exportInboundGroupSession(streamId, sessionId)

        if (!session) {
            throw new Error('Session key not found for session ' + sessionId)
        }

        await this.client.encryptAndShareMegolmSessions(streamId, [session], devicesInRoom)
    }

    /**
     * @param content - plaintext event content
     *
     * @returns Promise which resolves to the new event body
     */
    public async encrypt(streamId: string, payload: string): Promise<EncryptedData> {
        log('Starting to encrypt event')

        await this.ensureOutboundSession(streamId)

        const result = await this.olmDevice.encryptGroupMessage(payload, streamId)

        return new EncryptedData({
            algorithm: MEGOLM_ALGORITHM,
            senderKey: this.olmDevice.deviceCurve25519Key!,
            ciphertext: result.ciphertext,
            sessionId: result.sessionId,
        } satisfies PlainMessage<EncryptedData>)
    }
}
