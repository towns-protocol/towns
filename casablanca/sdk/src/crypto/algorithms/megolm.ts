import type { OlmGroupSessionExtraData } from '../olmDevice'
import { dlog, DLogger } from '../../dlog'

import {
    DecryptionAlgorithm,
    DecryptionClassParams,
    DecryptionError,
    EncryptionAlgorithm,
    IParams,
} from './base'
import { IMegolmEncryptedContent, MEGOLM_ALGORITHM, UserDeviceCollection } from '../olmLib'
import {
    ChannelMessage,
    KeyResponseKind,
    MegolmSession,
    MembershipOp,
    ToDeviceMessage,
    ToDeviceOp,
} from '@river/proto'
import { RiverEventV2 } from '../../eventV2'
import { make_ToDevice_KeyResponse } from '../../types'
import { StreamStateView } from '../../streamStateView'
import { Message } from '@bufbuild/protobuf'

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
            await this.shareSession(streamId, sessionId)
        }
    }

    private async shareSession(streamId: string, sessionId: string): Promise<void> {
        const devicesInRoom = await this.getDevicesInRoom(streamId)
        const session = await this.olmDevice.exportInboundGroupSession(streamId, sessionId)

        if (!session) {
            throw new Error('Session key not found for session ' + sessionId)
        }

        const toDeviceResponse = new ToDeviceMessage(
            make_ToDevice_KeyResponse({
                kind: KeyResponseKind.KRK_KEYS_FOUND,
                streamId: streamId,
                sessions: [session],
            }),
        )

        await this.baseApis.encryptAndSendToDevices(
            devicesInRoom,
            toDeviceResponse,
            ToDeviceOp.TDO_KEY_RESPONSE,
        )
    }

    /**
     * @param content - plaintext event content
     *
     * @returns Promise which resolves to the new event body
     */
    public async encryptMessage(
        streamId: string,
        content: Message,
        type: 'channelMessage' = 'channelMessage',
    ): Promise<IMegolmEncryptedContent> {
        this.logCall('Starting to encrypt event')

        const encoded = content.toJsonString()
        await this.ensureOutboundSession(streamId)
        const payloadJson = {
            channel_id: streamId,
            type: type,
            content: encoded,
        }

        const result = await this.olmDevice.encryptGroupMessage(
            JSON.stringify(payloadJson),
            streamId,
        )

        const encryptedContent: IMegolmEncryptedContent = {
            algorithm: MEGOLM_ALGORITHM,
            sender_key: this.olmDevice.deviceCurve25519Key!,
            ciphertext: result.ciphertext,
            session_id: result.sessionId,
            // Include our device ID so that recipients can send us a
            // m.new_device message if they don't have our session key.
            // XXX: Do we still need this now that m.new_device messages
            // no longer exist since #483?
            device_id: this.deviceId,
        }

        return encryptedContent
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
    private pendingEvents = new Map<string, Set<RiverEventV2>>()

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
    public async decryptEvent(event: RiverEventV2) {
        const content = event.getWireContent()
        if (!content.senderKey || !content.sessionId || !content.text) {
            throw new DecryptionError('MEGOLM_MISSING_FIELDS', 'Missing fields in input')
        }

        if (!event.shouldAttemptDecryption() && !event.isDecryptionFailure()) {
            this.logCall(`Not decrypting event ${event.getId()} (already decrypted)`)
            return
        }

        try {
            const { session } = await this.olmDevice.getInboundGroupSession(
                event.getStreamId(),
                content.sessionId,
            )

            if (!session) {
                throw new Error('Session not found')
            }

            const decrypted = session.decrypt(content.text)
            const payload = JSON.parse(decrypted.plaintext)
            if (!isValidPayload(payload)) {
                throw new Error('Invalid payload')
            }

            const type = payload.type
            const protoContent = payload.content
            if (type === 'channelMessage') {
                const message = ChannelMessage.fromJsonString(protoContent)
                const clearEvent = { content: message, type }
                event.setClearData(clearEvent)
                event.emitDecrypted()
                this.removeEventFromPendingListV2(event)
            } else {
                throw new DecryptionError(
                    'MEGOLM_UNKNOWN_MESSAGE_TYPE',
                    'Unknown message type: ' + type,
                )
            }
        } catch (e) {
            this.addEventToPendingListV2(event)
            event.setClearData(RiverEventV2.badEncryptedMessage(String(e)))
            event.emitDecrypted(e as Error)
            throw e
        }
    }

    /**
     * Add an event to the list of those awaiting their session keys.
     *
     * @internal
     *
     */
    private addEventToPendingListV2(event: RiverEventV2): void {
        const content = event.getWireContent()
        const sessionId = content.sessionId

        if (!sessionId) {
            this.logError('addEventToPendingListV2 called with missing sessionId')
            return
        }
        if (!this.pendingEvents.has(sessionId)) {
            this.pendingEvents.set(sessionId, new Set<RiverEventV2>())
        }
        this.pendingEvents.get(sessionId)?.add(event)
    }

    /**
     * Remove an event from the list of those awaiting their session keys.
     *
     * @internal
     *
     */
    private removeEventFromPendingListV2(event: RiverEventV2): void {
        const content = event.getWireContent()
        const sessionId = content.sessionId
        if (!sessionId) {
            this.logError('removeEventToPendingListV2 called with missing sessionId')
            return
        }
        const events = this.pendingEvents.get(sessionId)
        if (!events) {
            return
        }

        if (events.has(event)) {
            events.delete(event)
            if (events.size === 0) {
                this.pendingEvents.delete(sessionId)
            }
        }
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
            // have another go at decrypting events sent with this session.
            await this.retryDecryption(session.sessionId)
        } catch (e) {
            this.logError(`Error handling room key import: ${(<Error>e).message}`)
        }
    }

    /**
     * Have another go at decrypting events after we receive a key. Resolves once
     * decryption has been re-attempted on all events.
     *
     * @internal
     *
     * @returns whether all messages were successfully
     *     decrypted with trusted keys
     */
    private async retryDecryption(sessionId: string): Promise<boolean> {
        const pending = this.pendingEvents.get(sessionId)
        if (!pending) {
            return true
        }

        const pendingList = [...pending]
        this.logCall(
            'Retrying decryption on events:',
            pendingList.map((e) => `${e.getId()}`),
        )

        await Promise.all(
            pendingList.map(async (ev) => {
                try {
                    await this.decryptEvent(ev)
                } catch (e) {
                    // don't die if something goes wrong
                    this.logError(`Error retrying decryption: ${(<Error>e).message}`)
                }
            }),
        )

        // If decrypted successfully with trusted keys, they'll have
        // been removed from pendingEvents
        return !this.pendingEvents.has(sessionId)
    }

    private getEventById(eventId: string) {
        for (const [, pending] of this.pendingEvents) {
            for (const ev of pending) {
                if (ev.getId() === eventId) {
                    return ev
                }
            }
        }
        return undefined
    }

    // For debugging purposes only
    public async decryptEncryptionFailureWithEventId(eventId: string) {
        const event = this.getEventById(eventId)
        if (!event) {
            throw new Error('Event not found')
        }
        try {
            await this.crypto.decryptMegolmEvent(event)
            this.logCall(`Successfully decrypted event ${eventId}`)
        } catch (e) {
            this.logCall(`Error decrypting event ${eventId}: ${(<Error>e).message}`)
        }
    }
}

function isValidPayload(
    obj: unknown,
): obj is { content: string; type: string; channel_id: string } {
    return (
        obj !== null &&
        typeof obj === 'object' &&
        'content' in obj &&
        typeof obj.content === 'string' &&
        'type' in obj &&
        typeof obj.type === 'string' &&
        'channel_id' in obj &&
        typeof obj.channel_id === 'string'
    )
}
