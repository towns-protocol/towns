// todo: fix lint issues and remove exception see: https://linear.app/hnt-labs/issue/HNT-1721/address-linter-overrides-in-matrix-encryption-code-from-sdk
/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-misused-promises, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-argument */
import { dlog } from '../../dlog'
import { IEventOlmDecryptionResult } from '../crypto'
import { DecryptionAlgorithm, DecryptionError } from './base'
import { IInboundSession } from '../olmDevice'
import { EncryptedMessageEnvelope, OlmMessage, UserPayload_ToDevice } from '@river/proto'

const log = dlog('csb:olm')

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
    public async decryptEvent(
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
            payloadString = await this.decryptMessage(
                deviceKey,
                new EncryptedMessageEnvelope(message),
            )
        } catch (e) {
            throw new DecryptionError('OLM_BAD_ENCRYPTED_MESSAGE', 'Bad Encrypted Message', {
                sender: deviceKey,
                err: e instanceof Error ? e.message : 'unknown error',
            })
        }

        const payload = OlmMessage.fromJsonString(payloadString)

        return {
            clearEvent: payload,
            senderCurve25519Key: deviceKey,
        }
    }

    /**
     * Attempt to decrypt an Olm message
     *
     * @param theirDeviceIdentityKey -  Curve25519 identity key of the sender
     * @param message -  message object, with 'type' and 'body' fields
     *
     * @returns payload, if decrypted successfully.
     */
    private async decryptMessage(
        theirDeviceIdentityKey: string,
        message: EncryptedMessageEnvelope,
    ): Promise<string> {
        // This is a wrapper that serialises decryptions of prekey messages, because
        // otherwise we race between deciding we have no active sessions for the message
        // and creating a new one, which we can only do once because it removes the OTK.
        if (message.type !== 0) {
            // not a prekey message: we can safely just try & decrypt it
            return await this.reallyDecryptMessage(theirDeviceIdentityKey, message)
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
