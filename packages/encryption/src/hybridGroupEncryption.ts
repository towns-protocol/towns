import {
    EncryptedData,
    EncryptedDataSchema,
    EncryptedDataVersion,
    HybridGroupSessionKey,
} from '@towns-protocol/proto'
import { EncryptionAlgorithm, IEncryptionParams } from './base'
import { GroupEncryptionAlgorithmId } from './olmLib'
import { dlog } from '@towns-protocol/dlog'
import { encryptAesGcm, importAesGsmKeyBytes } from './cryptoAesGcm'
import { create } from '@bufbuild/protobuf'

const log = dlog('csb:encryption:groupEncryption')

/**
 * Hybrid Group encryption implementation
 *
 * @param params - parameters, as per {@link EncryptionAlgorithm}
 */
export class HybridGroupEncryption extends EncryptionAlgorithm {
    public readonly algorithm = GroupEncryptionAlgorithmId.HybridGroupEncryption
    public constructor(params: IEncryptionParams) {
        super(params)
    }

    public async ensureOutboundSession(
        streamId: string,
        opts?: { awaitInitialShareSession: boolean },
    ): Promise<void> {
        await this._ensureOutboundSession(streamId, opts)
    }

    public async _ensureOutboundSession(
        streamId: string,
        opts?: { awaitInitialShareSession: boolean },
    ): Promise<HybridGroupSessionKey> {
        try {
            const sessionKey = await this.device.getHybridGroupSessionKeyForStream(streamId)
            return sessionKey
        } catch (error) {
            const { miniblockNum, miniblockHash } = await this.client.getMiniblockInfo(streamId)
            // if we don't have a cached session at this point, create a new one
            const { sessionId, sessionKey } = await this.device.createHybridGroupSession(
                streamId,
                miniblockNum,
                miniblockHash,
            )
            log(`Started new hybrid group session ${sessionId}`)
            // don't wait for the session to be shared
            const promise = this.shareSession(streamId, sessionId)

            if (opts?.awaitInitialShareSession === true) {
                await promise
            } else {
                // await the promise but timeout after N seconds
                const waitTimeBeforeMovingOn = 30000
                await Promise.race([
                    promise,
                    new Promise<void>((resolve, _) =>
                        setTimeout(() => resolve(), waitTimeBeforeMovingOn),
                    ),
                ])
            }
            return sessionKey
        }
    }

    private async shareSession(streamId: string, sessionId: string): Promise<void> {
        const devicesInRoom = await this.client.getDevicesInStream(streamId)
        const session = await this.device.exportHybridGroupSession(streamId, sessionId)

        if (!session) {
            throw new Error('Session key not found for session ' + sessionId)
        }

        await this.client.encryptAndShareGroupSessions(
            streamId,
            [session],
            devicesInRoom,
            this.algorithm,
        )
    }

    /**
     * @deprecated
     */
    public async encrypt_deprecated_v0(streamId: string, payload: string): Promise<EncryptedData> {
        const sessionKey: HybridGroupSessionKey = await this._ensureOutboundSession(streamId)
        const key = await importAesGsmKeyBytes(sessionKey.key)
        const payloadBytes = new TextEncoder().encode(payload)
        const { ciphertext, iv } = await encryptAesGcm(key, payloadBytes)
        return create(EncryptedDataSchema, {
            algorithm: this.algorithm,
            senderKey: this.device.deviceCurve25519Key!,
            sessionIdBytes: sessionKey.sessionId,
            ciphertextBytes: ciphertext,
            ivBytes: iv,
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
        const sessionKey: HybridGroupSessionKey = await this._ensureOutboundSession(streamId)
        const key = await importAesGsmKeyBytes(sessionKey.key)
        const { ciphertext, iv } = await encryptAesGcm(key, payload)
        return create(EncryptedDataSchema, {
            algorithm: this.algorithm,
            senderKey: this.device.deviceCurve25519Key!,
            sessionIdBytes: sessionKey.sessionId,
            ciphertextBytes: ciphertext,
            ivBytes: iv,
            version: EncryptedDataVersion.ENCRYPTED_DATA_VERSION_1,
        })
    }
}
