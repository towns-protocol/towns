// todo: fix lint issues and remove exception see: https://linear.app/hnt-labs/issue/HNT-1721/address-linter-overrides-in-matrix-encryption-code-from-sdk
/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-argument */
import { dlog } from '../../dlog'
import { IEventDecryptionResult, IEventOlmDecryptionResult } from '../crypto'
import { DeviceInfo } from '../deviceInfo'
import { DecryptionAlgorithm, DecryptionError, EncryptionAlgorithm } from './base'
import { RiverEvent } from '../../event'
import { IOlmEncryptedContent, OLM_ALGORITHM, encryptMessageForDevice } from '../olmLib'
import { IInboundSession } from '../olmDevice'
import { ClearContent, RiverEventV2 } from '../../eventV2'
import {
    EncryptedMessageEnvelope,
    OlmMessage,
    ToDeviceMessage,
    UserPayload_ToDevice,
} from '@river/proto'

const log = dlog('csb:olm')

const DeviceVerification = DeviceInfo.DeviceVerification

/**
 * Olm encryption implementation
 *
 * @param params - parameters, as per {@link EncryptionAlgorithm}
 */
export class OlmEncryption extends EncryptionAlgorithm {
    private prepPromise: Promise<void> | null = null

    private ensureSession(userIds: string[]): Promise<void> {
        if (this.prepPromise) {
            // prep already in progress
            return this.prepPromise
        }

        // jterzis todo 06/14/23: fix this to use await for each async callback
        // rather than promise chaining.
        this.prepPromise = this.crypto.deviceList
            .downloadKeys(userIds)
            .then(() => {
                return this.crypto.ensureOlmSessionsForUsers(userIds)
            })
            .then(() => {
                return
            })
            .finally(() => {
                this.prepPromise = null
            })

        return this.prepPromise
    }

    /** Encrypt a message with Olm sessions for each user's device separately.
     *
     * @param content - plaintext event content
     *
     * @returns Promise which resolves to the new event body
     */
    public async encryptMessage(
        recipientUsers: string[],
        payload: ToDeviceMessage,
    ): Promise<IOlmEncryptedContent> {
        await this.ensureSession(recipientUsers)

        if (payload.payload === undefined) {
            throw new Error('payload value is undefined')
        }

        if (!this.olmDevice.deviceCurve25519Key) {
            throw new Error('Olm device has no curve25519 key')
        }

        const ciphertextRecord: Record<string, EncryptedMessageEnvelope> = {}
        const encryptedContent: IOlmEncryptedContent = {
            algorithm: OLM_ALGORITHM,
            sender_key: this.olmDevice.deviceCurve25519Key,
            ciphertext: ciphertextRecord,
        }

        const promises: Promise<void>[] = []

        for (const userId of recipientUsers) {
            const devices = this.crypto.deviceList.getStoredDevicesForUser(userId) || []

            for (const deviceInfo of devices) {
                const key = deviceInfo.getIdentityKey()
                if (key == this.olmDevice.deviceCurve25519Key) {
                    // don't bother sending to ourself
                    continue
                }
                /* todo: implement device verification
                if (deviceInfo.verified == DeviceVerification.BLOCKED) {
                    // don't bother setting up sessions with blocked users
                    continue
                }
                */
                const payloadFields = new OlmMessage({ content: payload })

                promises.push(
                    encryptMessageForDevice(
                        encryptedContent.ciphertext,
                        this.olmDevice,
                        userId,
                        deviceInfo,
                        payloadFields,
                    ),
                )
            }
        }

        return Promise.all(promises).then(() => encryptedContent)
    }
}

/**
 * Olm decryption implementation
 *
 * @param params - parameters, as per {@link DecryptionAlgorithm}
 */
export class OlmDecryption extends DecryptionAlgorithm {
    /**
     * returns a promise which resolves to a
     * {@link EventDecryptionResult} once we have finished
     * decrypting. Rejects with an `algorithms.DecryptionError` if there is a
     * problem decrypting the event.
     */
    public async decryptEventWithOlm(
        event: UserPayload_ToDevice,
        senderUserId: string,
    ): Promise<IEventOlmDecryptionResult> {
        const deviceKey = event.senderKey
        const ciphertext = event.message?.ciphertext

        if (!deviceKey) {
            throw new DecryptionError('OLM_MISSING_SENDER_KEY', 'Missing sender key')
        }
        if (!ciphertext) {
            throw new DecryptionError('OLM_MISSING_CIPHERTEXT', 'Missing ciphertext')
        }
        if (!this.olmDevice.deviceCurve25519Key) {
            throw new DecryptionError('OLM_MISSING_DEVICE_KEY', 'Missing device key')
        }

        if (!(this.olmDevice.deviceCurve25519Key in ciphertext)) {
            throw new DecryptionError(
                'OLM_NOT_INCLUDED_IN_RECIPIENTS',
                'Not included in recipients',
            )
        }
        const message = ciphertext[this.olmDevice.deviceCurve25519Key]
        let payloadString: string

        try {
            payloadString = await this.decryptMessage(deviceKey, message)
        } catch (e) {
            throw new DecryptionError('OLM_BAD_ENCRYPTED_MESSAGE', 'Bad Encrypted Message', {
                sender: deviceKey,
                err: e as Error,
            })
        }

        const payload = OlmMessage.fromJsonString(payloadString)

        // check that the device that encrypted the event belongs to the user
        // that the event claims it's from.  We need to make sure that our
        // device list is up-to-date.  If the device is unknown, we can only
        // assume that the device logged out.  Some event handlers, such as
        // secret sharing, may be more strict and reject events that come from
        // unknown devices.
        await this.crypto.deviceList.downloadKeys([senderUserId], false)
        // todo: validate device key belongs to sender
        //const senderKeyUser = this.crypto.deviceList.getUserByIdentityKey(OLM_ALGORITHM, deviceKey)

        return {
            clearEvent: payload,
            senderCurve25519Key: deviceKey,
        }
    }

    /**
     * returns a promise which resolves to a
     * {@link EventDecryptionResult} once we have finished
     * decrypting. Rejects with an `algorithms.DecryptionError` if there is a
     * problem decrypting the event.
     */
    public async decryptEvent(event: RiverEvent): Promise<IEventDecryptionResult> {
        const content = event.getWireContentToDevice()
        const deviceKey = content.content.sender_key
        const ciphertext = content.content.ciphertext

        if (!deviceKey) {
            throw new DecryptionError('OLM_MISSING_SENDER_KEY', 'Missing sender key')
        }
        if (!ciphertext) {
            throw new DecryptionError('OLM_MISSING_CIPHERTEXT', 'Missing ciphertext')
        }
        if (!this.olmDevice.deviceCurve25519Key) {
            throw new DecryptionError('OLM_MISSING_DEVICE_KEY', 'Missing device key')
        }

        if (!(this.olmDevice.deviceCurve25519Key in ciphertext)) {
            throw new DecryptionError(
                'OLM_NOT_INCLUDED_IN_RECIPIENTS',
                'Not included in recipients',
            )
        }
        const message = ciphertext[this.olmDevice.deviceCurve25519Key]
        let payloadString: string

        try {
            payloadString = await this.decryptMessage(
                deviceKey,
                new EncryptedMessageEnvelope(message),
            )
        } catch (e) {
            throw new DecryptionError('OLM_BAD_ENCRYPTED_MESSAGE', 'Bad Encrypted Message', {
                sender: deviceKey,
                err: e as Error,
            })
        }

        const payload = JSON.parse(payloadString)

        // check that we were the intended recipient, to avoid unknown-key attack
        // https://github.com/vector-im/vector-web/issues/2483
        if (payload.recipient != this.userId) {
            throw new DecryptionError(
                'OLM_BAD_RECIPIENT',
                `Message was intented for ${payload.recipient}`,
            )
        }

        if (payload.recipient_keys.donotuse != this.olmDevice.deviceDoNotUseKey) {
            throw new DecryptionError(
                'OLM_BAD_RECIPIENT_KEY',
                'Message not intended for this device',
                {
                    intended: payload.recipient_keys.donotuse,
                    our_key: this.olmDevice.deviceDoNotUseKey!,
                },
            )
        }

        // check that the device that encrypted the event belongs to the user
        // that the event claims it's from.  We need to make sure that our
        // device list is up-to-date.  If the device is unknown, we can only
        // assume that the device logged out.  Some event handlers, such as
        // secret sharing, may be more strict and reject events that come from
        // unknown devices.
        await this.crypto.deviceList.downloadKeys([event.getSender()!], false)
        const senderKeyUser = this.crypto.deviceList.getUserByIdentityKey(OLM_ALGORITHM, deviceKey)
        if (senderKeyUser !== event.getSender() && senderKeyUser != undefined) {
            throw new DecryptionError(
                'OLM_BAD_SENDER',
                'Message claimed to be from ' + event.getSender(),
                {
                    real_sender: senderKeyUser,
                },
            )
        }

        // check that the original sender matches what the homeserver told us, to
        // avoid people masquerading as others.
        // (this check is also provided via the sender's embedded ed25519 key,
        // which is checked elsewhere).
        if (payload.sender != event.getSender()) {
            throw new DecryptionError(
                'OLM_FORWARDED_MESSAGE',
                `Message forwarded from ${payload.sender}`,
                {
                    reported_sender: event.getSender()!,
                },
            )
        }

        // Olm events intended for a room have a channel_id.
        // todo: implement support for olm events over space_id's.
        if (payload.channel_id && payload.channel_id !== event.getChannelId()) {
            throw new DecryptionError(
                'OLM_BAD_ROOM',
                `Message intended for room ${payload.channel_id}`,
                {
                    reported_room: event.getChannelId() || 'ROOM_ID_UNDEFINED',
                },
            )
        }

        const claimedKeys = payload.keys || {}

        return {
            clearEvent: payload,
            senderCurve25519Key: deviceKey,
        }
    }

    public async decryptEventV2(_event: RiverEventV2): Promise<ClearContent> {
        throw new Error('Method not implemented.')
    }

    /**
     * Attempt to decrypt an Olm message
     *
     * @param theirDeviceIdentityKey -  Curve25519 identity key of the sender
     * @param message -  message object, with 'type' and 'body' fields
     *
     * @returns payload, if decrypted successfully.
     */
    private decryptMessage(
        theirDeviceIdentityKey: string,
        message: EncryptedMessageEnvelope,
    ): Promise<string> {
        // This is a wrapper that serialises decryptions of prekey messages, because
        // otherwise we race between deciding we have no active sessions for the message
        // and creating a new one, which we can only do once because it removes the OTK.
        if (message.type !== 0) {
            // not a prekey message: we can safely just try & decrypt it
            return this.reallyDecryptMessage(theirDeviceIdentityKey, message)
        } else {
            // todo: refactor to use await..async versus callback chaining
            const myPromise = this.olmDevice.olmPrekeyPromise.then(() => {
                return this.reallyDecryptMessage(theirDeviceIdentityKey, message)
            })
            // we want the error, but don't propagate it to the next decryption
            this.olmDevice.olmPrekeyPromise = myPromise.catch(() => {})
            return myPromise
        }
    }

    private async reallyDecryptMessage(
        theirDeviceIdentityKey: string,
        message: EncryptedMessageEnvelope,
    ): Promise<string> {
        const sessionIds = await this.olmDevice.getSessionIdsForDevice(theirDeviceIdentityKey)
        if (message.type === undefined) {
            log('No type field on encrypted message')
        }
        // try each session in turn.
        const decryptionErrors: Record<string, string> = {}
        for (const sessionId of sessionIds) {
            try {
                const payload = await this.olmDevice.decryptMessage(
                    theirDeviceIdentityKey,
                    sessionId,
                    message.type ?? 0,
                    message.body,
                )
                log(
                    'Decrypted Olm message from ' +
                        theirDeviceIdentityKey +
                        ' with session ' +
                        sessionId,
                )
                return payload
            } catch (e) {
                const foundSession = await this.olmDevice.matchesSession(
                    theirDeviceIdentityKey,
                    sessionId,
                    message.type ?? 0,
                    message.body,
                )

                if (foundSession) {
                    // decryption failed, but it was a prekey message matching this
                    // session, so it should have worked.
                    throw new Error(
                        'Error decrypting prekey message with existing session id ' +
                            sessionId +
                            ': ' +
                            (<Error>e).message,
                    )
                }

                // otherwise it's probably a message for another session; carry on, but
                // keep a record of the error
                decryptionErrors[sessionId] = (<Error>e).message
            }
        }

        if (message.type !== 0) {
            // not a prekey message, so it should have matched an existing session, but it
            // didn't work.

            if (sessionIds.length === 0) {
                throw new Error('No existing sessions')
            }

            throw new Error(
                'Error decrypting non-prekey message with existing sessions: ' +
                    JSON.stringify(decryptionErrors),
            )
        }

        // prekey message which doesn't match any existing sessions: make a new
        // session.

        let res: IInboundSession
        try {
            res = await this.olmDevice.createInboundSession(
                theirDeviceIdentityKey,
                message.type,
                message.body,
            )
        } catch (e) {
            decryptionErrors['(new)'] = (<Error>e).message
            throw new Error('Error decrypting prekey message: ' + JSON.stringify(decryptionErrors))
        }

        log(
            'created new inbound Olm session ID ' +
                res.session_id +
                ' with ' +
                theirDeviceIdentityKey,
        )
        return res.payload
    }
}
