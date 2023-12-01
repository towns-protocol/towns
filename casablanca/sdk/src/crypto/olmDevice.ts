// todo: fix lint issues and remove exception see: https://linear.app/hnt-labs/issue/HNT-1721/address-linter-overrides-in-matrix-encryption-code-from-sdk
/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-argument*/

import { dlog } from '../dlog'
import { ISessionInfo } from './store/types'
import { CryptoStore } from './store/cryptoStore'
import {
    OlmMegolmDelegate,
    Account,
    InboundGroupSession,
    OutboundGroupSession,
    Utility,
    Session,
} from '@river/mecholm'
import { IOutboundGroupSessionKey } from './algorithms/megolm'
import { EncryptedMessageEnvelope, MegolmSession } from '@river/proto'
import { MEGOLM_ALGORITHM } from './olmLib'

const log = dlog('csb:olmDevice')

// The maximum size of an event is 65K, and we base64 the content, so this is a
// reasonable approximation to the biggest plaintext we can encrypt.
const MAX_PLAINTEXT_LENGTH = (65536 * 3) / 4

/** data stored in the session store about an inbound group session */
export interface InboundGroupSessionData {
    stream_id: string // eslint-disable-line camelcase
    /** pickled Olm.InboundGroupSession */
    session: string
    keysClaimed: Record<string, string>
    /** whether this session is untrusted. */
    untrusted?: boolean
}

function checkPayloadLength(payloadString: string): void {
    if (payloadString === undefined) {
        throw new Error('payloadString undefined')
    }

    if (payloadString.length > MAX_PLAINTEXT_LENGTH) {
        // might as well fail early here rather than letting the olm library throw
        // a cryptic memory allocation error.
        //
        throw new Error(
            `Message too long (${payloadString.length} bytes). ` +
                `The maximum for an encrypted message is ${MAX_PLAINTEXT_LENGTH} bytes.`,
        )
    }
}

export interface IDecryptedGroupMessage {
    result: string
    keysClaimed: Record<string, string>
    streamId: string
    untrusted: boolean
}

export type OlmGroupSessionExtraData = {
    untrusted?: boolean
}

export interface IExportedDevice {
    pickleKey: string
    pickledAccount: string
    sessions: ISessionInfo[]
}
export interface IInitOpts {
    exportedOlmDevice?: IExportedDevice
    pickleKey?: string
    olmDelegate?: OlmMegolmDelegate
}

export class OlmDevice {
    public pickleKey = 'DEFAULT_KEY' // set by consumers

    /** Curve25519 key for the account, unknown until we load the account from storage in init() */
    public deviceCurve25519Key: string | null = null
    /** Ed25519 key for the account, unknown until we load the account from storage in init() */
    public deviceDoNotUseKey: string | null = null
    // keyId: base64(key)
    public fallbackKey: { keyId: string; key: string } = { keyId: '', key: '' }

    // Keep track of sessions that we're starting, so that we don't start
    // multiple sessions for the same device at the same time.
    public sessionsInProgress: Record<string, Promise<void>> = {} // set by consumers

    // Used by olm to serialise prekey message decryptions
    // todo: ensure we need this to serialize prekey message given we're using fallback keys
    // not one time keys, which suffer a race condition and expire once used.
    public olmPrekeyPromise: Promise<any> = Promise.resolve() // set by consumers

    // Store a set of decrypted message indexes for each group session.
    // This partially mitigates a replay attack where a MITM resends a group
    // message into the room.
    //
    // Keys are strings of form "<senderKey>|<session_id>|<message_index>"
    // Values are objects of the form "{id: <event id>, timestamp: <ts>}"
    private inboundGroupSessionMessageIndexes: Record<string, { id: string; timestamp: number }> =
        {}

    public constructor(
        private olmDelegate: OlmMegolmDelegate,
        private readonly cryptoStore: CryptoStore,
    ) {}

    /**
     * Iniitialize the OlmAccount. Must be called prior to any other operation
     * on the OlmDevice.
     *
     * Data from an export Olm Device can be provided in order to recreate this device.
     *
     * Attempts to load the OlmAccount from the crypto store, or create one otherwise
     * storing the account in storage.
     *
     * Reads the device keys from the OlmAccount object.
     *
     * @param fromExportedDevice - data from exported device
     *     that must be re-created.
     *     If present, opts.pickleKey is ignored
     *     (exported data already provides a pickle key)
     * @param pickleKey - pickle key to set instead of default one
     *
     *
     */
    public async init({
        pickleKey,
        exportedOlmDevice: fromExportedDevice,
    }: IInitOpts = {}): Promise<void> {
        let e2eKeys
        if (!this.olmDelegate.initialized) {
            await this.olmDelegate.init()
        }
        const account = this.olmDelegate.createAccount()

        try {
            if (fromExportedDevice) {
                if (pickleKey) {
                    log('ignoring opts.pickleKey' + ' because opts.fromExportedDevice is present.')
                }
                this.pickleKey = fromExportedDevice.pickleKey
                await this.initializeFromExportedDevice(fromExportedDevice, account)
            } else {
                if (pickleKey) {
                    this.pickleKey = pickleKey
                }
                await this.initializeAccount(account)
            }
            await this.generateFallbackKeyIfNeeded()
            this.fallbackKey = await this.getFallbackKey()
            e2eKeys = JSON.parse(account.identity_keys())
        } finally {
            account.free()
        }

        this.deviceCurve25519Key = e2eKeys.curve25519
        // note jterzis 07/19/23: deprecating ed25519 key in favor of TDK
        // see: https://linear.app/hnt-labs/issue/HNT-1796/tdk-signature-storage-curve25519-key
        this.deviceDoNotUseKey = e2eKeys.ed25519
        log(
            `OlmDevice.init: deviceCurve25519Key: ${
                this.deviceCurve25519Key
            }, fallbackKey ${JSON.stringify(this.fallbackKey)}`,
        )
    }

    /**
     * Populates the crypto store using data that was exported from an existing device.
     * Note that for now only the “account” and “sessions” stores are populated;
     * Other stores will be as with a new device.
     *
     * @param exportedData - Data exported from another device
     *     through the “export” method.
     * @param account - an olm account to initialize
     */
    private async initializeFromExportedDevice(
        exportedData: IExportedDevice,
        account: Account,
    ): Promise<void> {
        await this.cryptoStore.storeAccount(exportedData.pickledAccount)
        for (const session of exportedData.sessions) {
            const { deviceKey, sessionId } = session
            if (!deviceKey || !sessionId) {
                continue
            }
            const sessionInfo = {
                sessionId,
                deviceKey,
                session: session.session,
                lastReceivedMessageTs: session.lastReceivedMessageTs,
            }

            // await this.cryptoStore.storeEndToEndSession(sessionInfo)
        }
        account.unpickle(this.pickleKey, exportedData.pickledAccount)
    }

    private async initializeAccount(account: Account): Promise<void> {
        try {
            const pickledAccount = await this.cryptoStore.getAccount()
            account.unpickle(this.pickleKey, pickledAccount)
        } catch {
            account.create()
            const pickledAccount = account.pickle(this.pickleKey)
            await this.cryptoStore.storeAccount(pickledAccount)
        }
    }

    /**
     * Extract our OlmAccount from the crypto store and call the given function
     * with the account object
     * The `account` object is usable only within the callback passed to this
     * function and will be freed as soon the callback returns. It is *not*
     * usable for the rest of the lifetime of the transaction.
     * This function requires a live transaction object from cryptoStore.doTxn()
     * and therefore may only be called in a doTxn() callback.
     *
     * @param txn - Opaque transaction object from cryptoStore.doTxn()
     * @internal
     */
    private async getAccount(): Promise<Account> {
        const pickledAccount = await this.cryptoStore.getAccount()
        const account = this.olmDelegate.createAccount()
        account.unpickle(this.pickleKey, pickledAccount)
        return account
    }

    /**
     * Saves an account to the crypto store.
     * This function requires a live transaction object from cryptoStore.doTxn()
     * and therefore may only be called in a doTxn() callback.
     *
     * @param txn - Opaque transaction object from cryptoStore.doTxn()
     * @param Olm.Account object
     * @internal
     */
    private async storeAccount(account: Account): Promise<void> {
        await this.cryptoStore.storeAccount(account.pickle(this.pickleKey))
    }

    /**
     * get an OlmUtility and call the given function
     *
     * @returns result of func
     * @internal
     */
    private getUtility<T>(func: (utility: Utility) => T): T {
        const utility = this.olmDelegate.createOlmUtil()
        try {
            return func(utility)
        } finally {
            utility.free()
        }
    }

    /**
     * Signs a message with the ed25519 key for this account.
     *
     * @param message -  message to be signed
     * @returns base64-encoded signature
     */
    public async sign(message: string): Promise<string> {
        const account = await this.getAccount()
        return account.sign(message)
    }

    /**
     * Marks all of the fallback keys as published.
     */
    public async markKeysAsPublished(): Promise<void> {
        const account = await this.getAccount()
        account.mark_keys_as_published()
        await this.storeAccount(account)
    }

    /**
     * Generate a new fallback keys
     *
     * @returns Resolved once the account is saved back having generated the key
     */
    public async generateFallbackKeyIfNeeded(): Promise<void> {
        try {
            await this.getFallbackKey()
        } catch {
            const account = await this.getAccount()
            account.generate_fallback_key()
            await this.storeAccount(account)
        }
    }

    public async getFallbackKey(): Promise<{ keyId: string; key: string }> {
        const account = await this.getAccount()
        const record: Record<string, Record<string, string>> = JSON.parse(
            account.unpublished_fallback_key(),
        )
        const key = Object.values(record.curve25519)[0]
        const keyId = Object.keys(record.curve25519)[0]
        if (!key || !keyId) {
            throw new Error('No fallback key')
        }
        return { key, keyId }
    }

    public async forgetOldFallbackKey(): Promise<void> {
        const account = await this.getAccount()
        account.forget_old_fallback_key()
        await this.storeAccount(account)
    }

    // Outbound group session
    // ======================

    /**
     * Store an OutboundGroupSession in outboundSessionStore
     *
     */
    private async saveOutboundGroupSession(
        session: OutboundGroupSession,
        streamId: string,
    ): Promise<void> {
        return this.cryptoStore.withMegolmSessions(async () => {
            await this.cryptoStore.storeEndToEndOutboundGroupSession(
                session.session_id(),
                session.pickle(this.pickleKey),
                streamId,
            )
        })
    }

    /**
     * Extract OutboundGroupSession from the session store and call given fn.
     */
    private async getOutboundGroupSession(streamId: string): Promise<OutboundGroupSession> {
        return this.cryptoStore.withMegolmSessions(async () => {
            const pickled = await this.cryptoStore.getEndToEndOutboundGroupSession(streamId)
            if (!pickled) {
                throw new Error(`Unknown outbound group session ${streamId}`)
            }

            const session = this.olmDelegate.createOutboundGroupSession()
            session.unpickle(this.pickleKey, pickled)
            return session
        })
    }

    /**
     * Get the session keys for an outbound group session
     *
     * @param sessionId -  the id of the outbound group session
     *
     * @returns current chain index, and
     *     base64-encoded secret key.
     */
    public async getOutboundGroupSessionKey(streamId: string): Promise<IOutboundGroupSessionKey> {
        const session = await this.getOutboundGroupSession(streamId)
        const chain_index = session.message_index()
        const key = session.session_key()
        session.free()
        return { chain_index, key }
    }

    /**
     * Generate a new outbound group session
     *
     */
    public async createOutboundGroupSession(streamId: string): Promise<string> {
        return await this.cryptoStore.withMegolmSessions(async () => {
            // Create an outbound group session
            const session = this.olmDelegate.createOutboundGroupSession()
            const inboundSession = this.olmDelegate.createInboundGroupSession()
            try {
                session.create()
                const sessionId = session.session_id()
                await this.saveOutboundGroupSession(session, streamId)

                // While still inside the transaction, create an inbound counterpart session
                // to make sure that the session is exported at message index 0.
                const key = session.session_key()
                inboundSession.create(key)
                const pickled = inboundSession.pickle(this.pickleKey)

                await this.cryptoStore.storeEndToEndInboundGroupSession(streamId, sessionId, {
                    session: pickled,
                    stream_id: streamId,
                    keysClaimed: {},
                })

                return sessionId
            } catch (e) {
                log('Error creating outbound group session', e)
                throw e
            } finally {
                session.free()
                inboundSession.free()
            }
        })
    }

    // Inbound group session
    // =====================

    /**
     * Unpickle a session from a sessionData object and invoke the given function.
     * The session is valid only until func returns.
     *
     * @param sessionData - Object describing the session.
     * @param func - Invoked with the unpickled session
     * @returns result of func
     */
    private unpickleInboundGroupSession<T>(
        sessionData: InboundGroupSessionData,
    ): InboundGroupSession {
        const session = this.olmDelegate.createInboundGroupSession()
        session.unpickle(this.pickleKey, sessionData.session)
        return session
    }

    /**
     * Extract an InboundGroupSession from the crypto store and call the given function
     *
     * @param streamId - The stream ID to extract the session for, or null to fetch
     *     sessions for any room.
     * @param txn - Opaque transaction object from cryptoStore.doTxn()
     * @param func - function to call.
     *
     * @internal
     */
    async getInboundGroupSession(
        streamId: string,
        sessionId: string,
    ): Promise<{
        session: InboundGroupSession | undefined
        data: InboundGroupSessionData | undefined
    }> {
        const sessionInfo = await this.cryptoStore.getEndToEndInboundGroupSession(
            streamId,
            sessionId,
        )

        const session = sessionInfo ? this.unpickleInboundGroupSession(sessionInfo) : undefined

        return {
            session: session,
            data: sessionInfo,
        }
    }

    /**
     * Add an inbound group session to the session store
     *
     * @param streamId -     room in which this session will be used
     * @param senderKey -  base64-encoded curve25519 key of the sender
     * @param sessionId -  session identifier
     * @param sessionKey - base64-encoded secret key
     * @param keysClaimed - Other keys the sender claims.
     * @param exportFormat - true if the megolm keys are in export format
     *    (ie, they lack an ed25519 signature)
     * @param extraSessionData - any other data to be include with the session
     */
    public async addInboundGroupSession(
        streamId: string,
        sessionId: string,
        sessionKey: string,
        keysClaimed: Record<string, string>,
        _exportFormat: boolean,
        extraSessionData: OlmGroupSessionExtraData = {},
    ): Promise<void> {
        const { session: existingSession, data: existingSessionData } =
            await this.getInboundGroupSession(streamId, sessionId)

        const session = this.olmDelegate.createInboundGroupSession()
        try {
            log(`Adding megolm session ${streamId}|${sessionId}, session Key ${sessionKey}`)
            try {
                session.import_session(sessionKey)
            } catch {
                session.create(sessionKey)
            }
            if (sessionId != session.session_id()) {
                throw new Error('Mismatched group session ID from streamId: ' + streamId)
            }

            if (existingSession && existingSessionData) {
                log(`Update for megolm session ${streamId}|${sessionId}`)
                if (existingSession.first_known_index() <= session.first_known_index()) {
                    if (!existingSessionData.untrusted || extraSessionData.untrusted) {
                        // existing session has less-than-or-equal index
                        // (i.e. can decrypt at least as much), and the
                        // new session's trust does not win over the old
                        // session's trust, so keep it
                        log(`Keeping existing megolm session ${streamId}|${sessionId}`)
                        return
                    }
                    if (existingSession.first_known_index() < session.first_known_index()) {
                        // We want to upgrade the existing session's trust,
                        // but we can't just use the new session because we'll
                        // lose the lower index. Check that the sessions connect
                        // properly, and then manually set the existing session
                        // as trusted.
                        if (
                            existingSession.export_session(session.first_known_index()) ===
                            session.export_session(session.first_known_index())
                        ) {
                            log(
                                'Upgrading trust of existing megolm session ' +
                                    `${streamId}|${sessionId} based on newly-received trusted session`,
                            )
                            existingSessionData.untrusted = false
                            await this.cryptoStore.storeEndToEndInboundGroupSession(
                                streamId,
                                sessionId,
                                existingSessionData,
                            )
                        } else {
                            log(
                                `Newly-received megolm session ${streamId}|$sessionId}` +
                                    ' does not match existing session! Keeping existing session',
                            )
                        }
                        return
                    }
                    // If the sessions have the same index, go ahead and store the new trusted one.
                }
            }
            log(
                `Storing megolm session ${streamId}|${sessionId} with first index ${session.first_known_index()}`,
            )

            const sessionData = Object.assign({}, extraSessionData, {
                stream_id: streamId,
                session: session.pickle(this.pickleKey),
                keysClaimed: keysClaimed,
            })

            await this.cryptoStore.storeEndToEndInboundGroupSession(
                streamId,
                sessionId,
                sessionData,
            )
        } finally {
            session.free()
        }
    }

    /**
     * Encrypt an outgoing message with an outbound group session
     *
     * @param sessionId - this id of the session
     * @param payloadString - payload to be encrypted
     *
     * @returns ciphertext
     */
    public async encryptGroupMessage(
        payloadString: string,
        streamId: string,
    ): Promise<{ ciphertext: string; sessionId: string }> {
        return await this.cryptoStore.withMegolmSessions(async () => {
            log(`encrypting msg with megolm session for stream id ${streamId}`)

            checkPayloadLength(payloadString)
            const session = await this.getOutboundGroupSession(streamId)
            const ciphertext = session.encrypt(payloadString)
            const sessionId = session.session_id()
            await this.saveOutboundGroupSession(session, streamId)
            session.free()
            return { ciphertext, sessionId }
        })
    }

    public async encryptUsingFallbackKey(
        theirIdentityKey: string,
        fallbackKey: string,
        payload: string,
    ): Promise<EncryptedMessageEnvelope> {
        return this.cryptoStore.withAccountTx(async () => {
            const session = this.olmDelegate.createSession()
            try {
                const account = await this.getAccount()
                session.create_outbound(account, theirIdentityKey, fallbackKey)
                const result = session.encrypt(payload)
                return new EncryptedMessageEnvelope({ ciphertext: result.body, type: result.type })
            } catch (error) {
                log('Error encrypting message with fallback key', error)
                throw error
            } finally {
                session.free()
            }
        })
    }

    /**
     * Decrypt an incoming message using an existing session
     *
     * @param theirDeviceIdentityKey - Curve25519 identity key for the
     *     remote device
     * @param messageType -  messageType field from the received message
     * @param ciphertext - base64-encoded body from the received message
     *
     * @returns decrypted payload.
     */
    public async decryptMessage(
        envelope: EncryptedMessageEnvelope,
        theirDeviceIdentityKey: string,
    ): Promise<string> {
        if (envelope.type !== 0) {
            throw new Error('Only pre-key messages supported')
        }

        return await this.cryptoStore.withAccountTx(async () => {
            const account = await this.getAccount()
            const session = this.olmDelegate.createSession()
            const sessionDesc = session.describe()
            log(
                'Olm Session ID ' +
                    session.session_id() +
                    ' from ' +
                    theirDeviceIdentityKey +
                    ': ' +
                    sessionDesc,
            )
            try {
                session.create_inbound_from(account, theirDeviceIdentityKey, envelope.ciphertext)
                await this.storeAccount(account)
                return session.decrypt(envelope.type, envelope.ciphertext)
            } catch (e) {
                throw new Error(
                    'Error decrypting prekey message: ' + JSON.stringify((<Error>e).message),
                )
            } finally {
                session.free()
            }
        })
    }

    // Utilities
    // =========

    /**
     * Verify an ed25519 signature.
     *
     * @param key - ed25519 key
     * @param message - message which was signed
     * @param signature - base64-encoded signature to be checked
     *
     * @throws Error if there is a problem with the verification. If the key was
     * too small then the message will be "OLM.INVALID_BASE64". If the signature
     * was invalid then the message will be "OLM.BAD_MESSAGE_MAC".
     */
    public verifySignature(key: string, message: string, signature: string): void {
        this.getUtility(function (util: Utility) {
            util.ed25519_verify(key, message, signature)
        })
    }

    // Group Sessions

    public async getInboundGroupSessionIds(streamId: string): Promise<string[]> {
        return await this.cryptoStore.getInboundGroupSessionIds(streamId)
    }

    /**
     * Determine if we have the keys for a given megolm session
     *
     * @param streamId - stream in which the message was received
     * @param senderKey - base64-encoded curve25519 key of the sender
     * @param sessionId - session identifier
     */
    public async hasInboundSessionKeys(streamId: string, sessionId: string): Promise<boolean> {
        const sessionData = await this.cryptoStore.withMegolmSessions(async () => {
            return this.cryptoStore.getEndToEndInboundGroupSession(streamId, sessionId)
        })

        if (!sessionData) {
            return false
        }
        if (streamId !== sessionData.stream_id) {
            log(
                `[hasInboundSessionKey]: requested keys for inbound group session` +
                    `${sessionId}, with incorrect stream id ` +
                    `(expected ${sessionData.stream_id}, ` +
                    `was ${streamId})`,
            )
            return false
        } else {
            return true
        }
    }

    /**
     * Export an inbound group session
     *
     * @param streamId - streamId of session
     * @param sessionId  - session identifier
     * @param sessionData - the session object from the store
     */
    public async exportInboundGroupSession(
        streamId: string,
        sessionId: string,
    ): Promise<MegolmSession | undefined> {
        const sessionData = await this.cryptoStore.getEndToEndInboundGroupSession(
            streamId,
            sessionId,
        )
        if (!sessionData) {
            return undefined
        }

        const session = this.unpickleInboundGroupSession(sessionData)
        const messageIndex = session.first_known_index()
        const sessionKey = session.export_session(messageIndex)
        session.free()

        return new MegolmSession({
            streamId: streamId,
            sessionId: sessionId,
            sessionKey: sessionKey,
            algorithm: MEGOLM_ALGORITHM,
        })
    }
}
