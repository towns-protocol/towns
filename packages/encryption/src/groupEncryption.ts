import { EncryptedData, EncryptedDataSchema, EncryptedDataVersion } from '@towns-protocol/proto'
import { EncryptionAlgorithm, EnsureOutboundSessionOpts, IEncryptionParams } from './base'
import { GroupEncryptionAlgorithmId } from './olmLib'
import { bin_toBase64, dlog } from '@towns-protocol/utils'
import { create } from '@bufbuild/protobuf'

const log = dlog('csb:encryption:groupEncryption')

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
 * Group encryption implementation
 *
 * @param params - parameters, as per {@link EncryptionAlgorithm}
 */
export class GroupEncryption extends EncryptionAlgorithm {
    public readonly algorithm = GroupEncryptionAlgorithmId.GroupEncryption
    public constructor(params: IEncryptionParams) {
        super(params)
    }

    public async ensureOutboundSession(
        streamId: string,
        opts?: EnsureOutboundSessionOpts,
    ): Promise<string> {
        try {
            const sessionKey = await this.device.getOutboundGroupSessionKey(streamId)
            return sessionKey.sessionId
        } catch (error) {
            // if we don't have a cached session at this point, create a new one
            const sessionId = await this.device.createOutboundGroupSession(streamId)
            log(`Started new megolm session ${sessionId}`)
            // don't wait for the session to be shared
            const promise = this.shareSession(streamId, sessionId, opts?.priorityUserIds ?? [])

            if (opts?.shareShareSessionTimeoutMs === 0) {
                await promise
            } else {
                // await the promise but timeout after N seconds
                const waitTimeBeforeMovingOn = opts?.shareShareSessionTimeoutMs ?? 30000
                await Promise.race([
                    promise,
                    new Promise<void>((resolve, _) =>
                        setTimeout(() => resolve(), waitTimeBeforeMovingOn),
                    ),
                ])
            }
            return sessionId
        }
    }

    public async hasOutboundSession(streamId: string): Promise<boolean> {
        try {
            await this.device.getOutboundGroupSessionKey(streamId)
            return true
        } catch {
            return false
        }
    }

    private async shareSession(
        streamId: string,
        sessionId: string,
        priorityUserIds: string[],
    ): Promise<void> {
        const session = await this.device.exportInboundGroupSession(streamId, sessionId)
        if (!session) {
            throw new Error('Session key not found for session ' + sessionId)
        }
        await this.client.encryptAndShareGroupSessionsToStream(
            streamId,
            [session],
            this.algorithm,
            priorityUserIds,
        )
    }

    /**
     * @deprecated
     */
    public async encrypt_deprecated_v0(streamId: string, payload: string): Promise<EncryptedData> {
        await this.ensureOutboundSession(streamId)
        const result = await this.device.encryptGroupMessage(payload, streamId)
        return create(EncryptedDataSchema, {
            algorithm: this.algorithm,
            senderKey: this.device.deviceCurve25519Key!,
            ciphertext: result.ciphertext,
            sessionId: result.sessionId,
            version: EncryptedDataVersion.ENCRYPTED_DATA_VERSION_0,
        })
    }

    /**
     * @param content - plaintext event content
     *
     * @returns Promise which resolves to the new event body
     */
    public async encrypt(streamId: string, payload: Uint8Array): Promise<EncryptedData> {
        log('Starting to encrypt event')
        await this.ensureOutboundSession(streamId)
        const result = await this.device.encryptGroupMessage(bin_toBase64(payload), streamId)
        return create(EncryptedDataSchema, {
            algorithm: this.algorithm,
            senderKey: this.device.deviceCurve25519Key!,
            ciphertext: result.ciphertext,
            sessionId: result.sessionId,
            version: EncryptedDataVersion.ENCRYPTED_DATA_VERSION_1,
        })
    }
}
