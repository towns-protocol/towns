import type { OlmGroupSessionExtraData } from '../olmDevice'
import { dlog, DLogger } from '../../dlog'

import {
    DecryptionAlgorithm,
    DecryptionClassParams,
    DecryptionError,
    EncryptionAlgorithm,
    IParams,
} from './base'
import { MEGOLM_ALGORITHM, MegolmSession, UserDeviceCollection } from '../olmLib'
import { EncryptedData, MembershipOp } from '@river/proto'
import { StreamStateView } from '../../streamStateView'
import { PlainMessage } from '@bufbuild/protobuf'

export interface IOutboundGroupSessionKey {
    chain_index: number
    key: string
}

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
    private readonly logCall: DLogger
    private readonly logError: DLogger

    public constructor(params: IParams) {
        super(params)
        this.logCall = dlog('csb:sdk:megolm').extend(`[encryption]`)
        this.logError = dlog('csb:sdk:megolm').extend(`[encryption]:ERROR `)
    }

    private async ensureOutboundSession(streamId: string): Promise<void> {
        try {
            await this.olmDevice.getOutboundGroupSessionKey(streamId)
            return
        } catch (error) {
            // if we don't have a cached session at this point, create a new one
            const sessionId = await this.olmDevice.createOutboundGroupSession(streamId)
            this.logCall(`Started new megolm session ${sessionId}`)
            // don't wait for the session to be shared
            void this.shareSession(streamId, sessionId)
        }
    }

    private async shareSession(streamId: string, sessionId: string): Promise<void> {
        const devicesInRoom = await this.getDevicesInRoom(streamId)
        const session = await this.olmDevice.exportInboundGroupSession(streamId, sessionId)

        if (!session) {
            throw new Error('Session key not found for session ' + sessionId)
        }

        await this.baseApis.encryptAndShareMegolmSessions(streamId, [session], devicesInRoom)
    }

    /**
     * @param content - plaintext event content
     *
     * @returns Promise which resolves to the new event body
     */
    public async encryptMessage(streamId: string, payload: string): Promise<EncryptedData> {
        this.logCall('Starting to encrypt event')

        await this.ensureOutboundSession(streamId)

        const result = await this.olmDevice.encryptGroupMessage(payload, streamId)

        return new EncryptedData({
            algorithm: MEGOLM_ALGORITHM,
            senderKey: this.olmDevice.deviceCurve25519Key!,
            ciphertext: result.ciphertext,
            sessionId: result.sessionId,
        } satisfies PlainMessage<EncryptedData>)
    }

    /**
     * Get the list of active devices for all users in the room
     *
     *
     * @returns Promise which resolves to `null`, or an array whose
     *     first element is a {@link DeviceInfoMap} indicating
     *     the devices that messages should be encrypted to, and whose second
     *     element is a map from userId to deviceId to data indicating the devices
     *     that are in the room but that have been blocked.
     */
    private async getDevicesInRoom(stream_id: string): Promise<UserDeviceCollection> {
        let stream: StreamStateView | undefined
        stream = this.baseApis.stream(stream_id)?.view
        if (!stream) {
            stream = await this.baseApis.getStream(stream_id)
        }
        if (!stream) {
            this.logError(`stream for room ${stream_id} not found`)
            return {}
        }
        const members = Array.from(stream.getUsersEntitledToKeyExchange())
        this.logCall(
            `Encrypting for users (shouldEncryptForInvitedMembers:`,
            members.map((u) => `${u} (${MembershipOp[MembershipOp.SO_JOIN]})`),
        )
        return await this.baseApis.downloadUserDeviceInfo(members)
    }
}

/**
 * Megolm decryption implementation
 *
 * @param params - parameters, as per {@link DecryptionAlgorithm}
 */
export class MegolmDecryption extends DecryptionAlgorithm {
    private readonly logCall: DLogger
    private readonly logError: DLogger

    public constructor(params: DecryptionClassParams<IParams>) {
        super(params)
        this.logCall = dlog('csb:sdk:megolm').extend(`[decryption]`)
        this.logError = dlog('csb:sdk:megolm').extend(`[decryption]:ERROR `)
    }

    /**
     * returns a promise which resolves to a
     * {@link EventDecryptionResult} once we have finished
     * decrypting, or rejects with an `algorithms.DecryptionError` if there is a
     * problem decrypting the event.
     */
    public async decryptEvent(streamId: string, content: EncryptedData): Promise<string> {
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
    public async importRoomKey(streamId: string, session: MegolmSession): Promise<void> {
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
            this.logError(`Error handling room key import: ${(<Error>e).message}`)
        }
    }
}
