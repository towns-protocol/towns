// todo: fix lint issues and remove exception see: https://linear.app/hnt-labs/issue/HNT-1721/address-linter-overrides-in-matrix-encryption-code-from-sdk
import { CryptoStore } from './cryptoStore'
import {
    Account,
    GroupSession,
    GroupSessionVersion,
    InboundGroupSession,
    OlmMessage,
    Session,
    SessionConfigVersion,
    initAsync,
} from '@towns-protocol/vodozemac'
import { GroupEncryptionAlgorithmId, GroupEncryptionSession } from './olmLib'
import {
    bin_equal,
    bin_fromBase64,
    bin_fromHexString,
    bin_fromString,
    bin_toHexString,
    dlog,
} from '@towns-protocol/dlog'
import type { HybridGroupSessionRecord } from './storeTypes'
import {
    ExportedDevice,
    ExportedDevice_GroupSession,
    ExportedDevice_HybridGroupSession,
    ExportedDeviceSchema,
    ExportedDevice_GroupSessionSchema,
    ExportedDevice_HybridGroupSessionSchema,
    HybridGroupSessionKey,
    HybridGroupSessionKeySchema,
    PlainMessage,
} from '@towns-protocol/proto'
import { exportAesGsmKeyBytes, generateNewAesGcmKey } from './cryptoAesGcm'
import { Dexie } from 'dexie'
import { create, fromBinary, toBinary } from '@bufbuild/protobuf'

const log = dlog('csb:encryption:encryptionDevice')

const string_to32bytes = (str: string) => {
    const encoder = new TextEncoder()
    const src = encoder.encode(str) // Uint8Array of UTF-8 bytes
    const out = new Uint8Array(32) // auto-filled with zeros
    out.set(src.subarray(0, 32)) // copy & truncate
    return out
}

// The maximum size of an event is 65K, and we base64 the content, so this is a
// reasonable approximation to the biggest plaintext we can encrypt.
const MAX_PLAINTEXT_LENGTH = (65536 * 3) / 4

/** data stored in the session store about an inbound group session */
export interface InboundGroupSessionDataVodezemac {
    stream_id: string // eslint-disable-line camelcase
    /** pickled InboundGroupSession */
    session: string
    keysClaimed: Record<string, string>
    /** whether this session is untrusted. */
    untrusted?: boolean
}

export type EncryptionDeviceInitOptsVodozemac = {
    fromExportedDevice?: ExportedDevice
    pickleKey?: string
}

function checkPayloadLength(
    payloadString: string,
    opts: { streamId?: string; source: string },
): void {
    if (payloadString === undefined) {
        throw new Error('payloadString undefined')
    }

    if (payloadString.length > MAX_PLAINTEXT_LENGTH) {
        // might as well fail early here rather than letting the olm library throw
        // a cryptic memory allocation error.
        throw new Error(
            `Message too long (${payloadString.length} bytes). ` +
                `The maximum for an encrypted message is ${MAX_PLAINTEXT_LENGTH} bytes.` +
                `streamId: ${opts.streamId}, source: ${opts.source}`,
        )
    }
}

export interface IDecryptedGroupMessageVodozemac {
    result: string
    keysClaimed: Record<string, string>
    streamId: string
    untrusted: boolean
}

export type GroupSessionExtraDataVodozemac = {
    untrusted?: boolean
}

export class EncryptionDeviceVodozemac {
    // https://linear.app/hnt-labs/issue/HNT-4273/pick-a-better-pickle-key-in-olmdevice
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

    public constructor(private readonly cryptoStore: CryptoStore) {}

    /**
     * Iniitialize the Account. Must be called prior to any other operation
     * on the device.
     *
     * Data from an exported device can be provided in order to recreate this device.
     *
     * Attempts to load the Account from the crypto store, or create one otherwise
     * storing the account in storage.
     *
     * Reads the device keys from the Account object.
     *
     * @param fromExportedDevice - data from exported device
     *     that must be re-created.
     *     If present, opts.pickleKey is ignored
     *     (exported data already provides a pickle key)
     * @param pickleKey - pickle key to set instead of default one
     *
     *
     */
    public async init(opts?: EncryptionDeviceInitOptsVodozemac): Promise<void> {
        await initAsync()
        const { fromExportedDevice, pickleKey } = opts ?? {}
        let account: Account | undefined
        try {
            if (fromExportedDevice) {
                account = Account.from_libolm_pickle(
                    fromExportedDevice.pickledAccount,
                    string_to32bytes(fromExportedDevice.pickleKey),
                )
                await this.initializeFromExportedDevice(fromExportedDevice)
            } else {
                try {
                    if (pickleKey) {
                        this.pickleKey = pickleKey
                    }
                    const pickledAccount = await this.cryptoStore.getAccount()
                    account = Account.from_libolm_pickle(
                        pickledAccount,
                        string_to32bytes(this.pickleKey),
                    )
                } catch {
                    account = new Account()
                    account.generate_fallback_key()
                    const pickledAccount = account.pickle_libolm(string_to32bytes(this.pickleKey))
                    await this.cryptoStore.storeAccount(pickledAccount)
                }
            }
            // await this.generateFallbackKeyIfNeeded()
            this.fallbackKey = await this.getFallbackKey()
        } catch (e) {
            log('Error initializing account', e)
            throw e
        }
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        this.deviceCurve25519Key = account.curve25519_key
        // note jterzis 07/19/23: deprecating ed25519 key in favor of TDK
        // see: https://linear.app/hnt-labs/issue/HNT-1796/tdk-signature-storage-curve25519-key
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        this.deviceDoNotUseKey = account.ed25519_key
        log(
            `init: deviceCurve25519Key: ${this.deviceCurve25519Key}, fallbackKey ${JSON.stringify(
                this.fallbackKey,
            )}`,
        )
        await this.cryptoStore.withAccountTx(async () => {
            await this.cryptoStore.storeAccount(
                account.pickle_libolm(string_to32bytes(this.pickleKey)),
            )
        })
        account?.free()
    }

    private async initializeFromExportedDevice(exportedData: ExportedDevice): Promise<void> {
        await this.cryptoStore.withAccountTx(() =>
            this.cryptoStore.storeAccount(exportedData.pickledAccount),
        )
        await this.cryptoStore.withGroupSessions(() => {
            return Promise.all([
                ...exportedData.outboundSessions.map((session) =>
                    this.cryptoStore.storeEndToEndOutboundGroupSession(
                        session.sessionId,
                        session.session,
                        session.streamId,
                    ),
                ),
                ...exportedData.inboundSessions.map((session) =>
                    this.cryptoStore.storeEndToEndInboundGroupSession(
                        session.streamId,
                        session.sessionId,
                        {
                            stream_id: session.streamId,
                            session: session.session,
                            keysClaimed: {},
                        } satisfies InboundGroupSessionDataVodezemac,
                    ),
                ),
                ...exportedData.hybridGroupSessions.map((session) =>
                    this.cryptoStore.storeHybridGroupSession(session),
                ),
            ])
        })
    }

    /**
     * Export the current device state
     * @returns ExportedDevice object containing the device state
     */
    public async exportDevice(): Promise<ExportedDevice> {
        const account = await this.getAccount()
        const pickledAccount = account.pickle_libolm(string_to32bytes(this.pickleKey))

        const [inboundSessions, outboundSessions, hybridGroupSessions] = await Promise.all([
            this.cryptoStore.getAllEndToEndInboundGroupSessions(),
            this.cryptoStore.getAllEndToEndOutboundGroupSessions(),
            this.cryptoStore.getAllHybridGroupSessions(),
        ])

        return create(ExportedDeviceSchema, {
            pickleKey: this.pickleKey,
            pickledAccount,
            inboundSessions: inboundSessions.map((session) =>
                create(ExportedDevice_GroupSessionSchema, {
                    sessionId: session.sessionId,
                    streamId: session.streamId,
                    session: session.session,
                } satisfies PlainMessage<ExportedDevice_GroupSession>),
            ),
            outboundSessions: outboundSessions.map((session) =>
                create(ExportedDevice_GroupSessionSchema, {
                    sessionId: session.sessionId,
                    streamId: session.streamId,
                    session: session.session,
                } satisfies PlainMessage<ExportedDevice_GroupSession>),
            ),
            hybridGroupSessions: hybridGroupSessions.map((session) =>
                create(ExportedDevice_HybridGroupSessionSchema, {
                    sessionId: session.sessionId,
                    streamId: session.streamId,
                    sessionKey: session.sessionKey,
                    miniblockNum: session.miniblockNum,
                } satisfies PlainMessage<ExportedDevice_HybridGroupSession>),
            ),
        })

        account.free()
    }

    /**
     * Extract our Account from the crypto store and call the given function
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
        const account = Account.from_libolm_pickle(pickledAccount, string_to32bytes(this.pickleKey))
        return account
    }

    /**
     * Saves an account to the crypto store.
     * This function requires a live transaction object from cryptoStore.doTxn()
     * and therefore may only be called in a doTxn() callback.
     *
     * @param txn - Opaque transaction object from cryptoStore.doTxn()
     * @param Account object
     * @internal
     */
    private async storeAccount(account: Account): Promise<void> {
        await this.cryptoStore.storeAccount(account.pickle_libolm(string_to32bytes(this.pickleKey)))
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
        const record = account.fallback_key as Map<string, string>
        const [keyId, curve25519Key] = Array.from(record.entries())[0]
        return { keyId, key: curve25519Key }
    }

    public async forgetOldFallbackKey(): Promise<void> {
        const account = await this.getAccount()
        account.generate_fallback_key()
        await this.storeAccount(account)
    }

    // Outbound group session
    // ======================

    /**
     * Store an OutboundGroupSession in outboundSessionStore
     *
     */
    private async saveOutboundGroupSession(session: GroupSession, streamId: string): Promise<void> {
        return this.cryptoStore.withGroupSessions(async () => {
            await this.cryptoStore.storeEndToEndOutboundGroupSession(
                session.session_id,
                session.pickle(string_to32bytes(this.pickleKey)),
                streamId,
            )
        })
    }

    /**
     * Extract OutboundGroupSession from the session store and call given fn.
     */
    private async getOutboundGroupSession(streamId: string): Promise<GroupSession> {
        return this.cryptoStore.withGroupSessions(async () => {
            const pickled = await this.cryptoStore.getEndToEndOutboundGroupSession(streamId)
            if (!pickled) {
                throw new Error(`Unknown outbound group session ${streamId}`)
            }
            return GroupSession.from_pickle(pickled, string_to32bytes(this.pickleKey))
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
    public async getOutboundGroupSessionKey(streamId: string) {
        const session = await this.getOutboundGroupSession(streamId)
        const messageIndex = session.message_index
        const key = session.session_key
        session.free()
        return { messageIndex, key }
    }

    /** */
    public async getHybridGroupSessionKeyForStream(
        streamId: string,
    ): Promise<HybridGroupSessionKey> {
        return this.cryptoStore.withGroupSessions(async () => {
            const sessionRecords = await this.cryptoStore.getHybridGroupSessionsForStream(streamId)
            if (sessionRecords.length === 0) {
                throw new Error(`hybrid group session not found for stream ${streamId}`)
            }
            // sort on session.miniblockNum decending
            const sessionRecord = sessionRecords.reduce(
                (max, current) => (current.miniblockNum > max.miniblockNum ? current : max),
                sessionRecords[0],
            )
            return fromBinary(HybridGroupSessionKeySchema, sessionRecord.sessionKey)
        })
    }

    /** */
    public async getHybridGroupSessionKey(
        streamId: string,
        sessionId: string,
    ): Promise<HybridGroupSessionKey> {
        return this.cryptoStore.withGroupSessions(async () => {
            const sessionRecord = await this.cryptoStore.getHybridGroupSession(streamId, sessionId)
            if (!sessionRecord) {
                throw new Error(`hybrid group session not found for stream ${streamId}`)
            }
            return fromBinary(HybridGroupSessionKeySchema, sessionRecord.sessionKey)
        })
    }

    /**
     * Generate a new outbound group session
     *
     */
    public async createOutboundGroupSession(streamId: string): Promise<string> {
        return await this.cryptoStore.withGroupSessions(async () => {
            // Create an outbound group session
            const session = new GroupSession(GroupSessionVersion.V1)
            const inboundSession = new InboundGroupSession(
                session.session_key,
                GroupSessionVersion.V1,
            )
            try {
                const sessionId = session.session_id
                await this.saveOutboundGroupSession(session, streamId)
                // While still inside the transaction, create an inbound counterpart session
                // to make sure that the session is exported at message index 0.
                const pickled = inboundSession.pickle(string_to32bytes(this.pickleKey))
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

    /** */
    public async createHybridGroupSession(
        streamId: string,
        miniblockNum: bigint,
        miniblockHash: Uint8Array,
    ): Promise<{
        sessionId: string
        sessionRecord: HybridGroupSessionRecord
        sessionKey: HybridGroupSessionKey
    }> {
        const streamIdBytes = bin_fromHexString(streamId)
        const aesKey = await generateNewAesGcmKey()
        const aesKeyBytes = await exportAesGsmKeyBytes(aesKey)
        const sessionIdBytes = await hybridSessionKeyHashVodozemac(
            streamIdBytes,
            aesKeyBytes,
            miniblockNum,
            miniblockHash,
        )
        const sessionKey = create(HybridGroupSessionKeySchema, {
            sessionId: sessionIdBytes,
            streamId: streamIdBytes,
            key: aesKeyBytes,
            miniblockNum,
            miniblockHash,
        } satisfies PlainMessage<HybridGroupSessionKey>)
        const sessionId = bin_toHexString(sessionIdBytes)
        const sessionRecord: HybridGroupSessionRecord = {
            sessionId,
            streamId: streamId,
            sessionKey: toBinary(HybridGroupSessionKeySchema, sessionKey),
            miniblockNum,
        }

        return this.cryptoStore.withGroupSessions(async () => {
            await this.cryptoStore.storeHybridGroupSession(sessionRecord)
            return { sessionId, sessionRecord, sessionKey }
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
    private unpickleInboundGroupSession(
        sessionData: InboundGroupSessionDataVodezemac,
    ): InboundGroupSession {
        const session = InboundGroupSession.from_pickle(
            sessionData.session,
            string_to32bytes(this.pickleKey),
        )
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
        data: InboundGroupSessionDataVodezemac | undefined
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
     * @param exportFormat - true if the group keys are in export format
     *    (ie, they lack an ed25519 signature)
     * @param extraSessionData - any other data to be include with the session
     */
    public async addInboundGroupSession(
        streamId: string,
        sessionId: string,
        sessionKey: string,
        keysClaimed: Record<string, string>,
        _exportFormat: boolean,
        extraSessionData: GroupSessionExtraDataVodozemac = {},
    ): Promise<void> {
        const { session: existingSession, data: existingSessionData } =
            await this.getInboundGroupSession(streamId, sessionId)

        let session: InboundGroupSession
        try {
            session = InboundGroupSession.import(sessionKey, GroupSessionVersion.V1)
        } catch {
            session = new InboundGroupSession(sessionKey, GroupSessionVersion.V1)
        }
        try {
            log(`Adding group session ${streamId}|${sessionId}`)
            if (sessionId != session.session_id) {
                throw new Error('Mismatched group session ID from streamId: ' + streamId)
            }

            if (existingSession && existingSessionData) {
                log(`Update for group session ${streamId}|${sessionId}`)
                if (existingSession.first_known_index <= session.first_known_index) {
                    if (!existingSessionData.untrusted || extraSessionData.untrusted) {
                        // existing session has less-than-or-equal index
                        // (i.e. can decrypt at least as much), and the
                        // new session's trust does not win over the old
                        // session's trust, so keep it
                        log(`Keeping existing group session ${streamId}|${sessionId}`)
                        return
                    }
                    if (existingSession.first_known_index < session.first_known_index) {
                        // We want to upgrade the existing session's trust,
                        // but we can't just use the new session because we'll
                        // lose the lower index. Check that the sessions connect
                        // properly, and then manually set the existing session
                        // as trusted.
                        if (
                            existingSession.export_at(session.first_known_index) ===
                            session.export_at(session.first_known_index)
                        ) {
                            log(
                                'Upgrading trust of existing group session ' +
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
                                `Newly-received group session ${streamId}|$sessionId}` +
                                    ' does not match existing session! Keeping existing session',
                            )
                        }
                        return
                    }
                    // If the sessions have the same index, go ahead and store the new trusted one.
                }
            }
            log(
                `Storing group session ${streamId}|${sessionId} with first index ${session.first_known_index}`,
            )

            const sessionData = Object.assign({}, extraSessionData, {
                stream_id: streamId,
                session: session.pickle(string_to32bytes(this.pickleKey)),
                keysClaimed: keysClaimed,
            })
            await this.cryptoStore.withGroupSessions(async () => {
                await this.cryptoStore.storeEndToEndInboundGroupSession(
                    streamId,
                    sessionId,
                    sessionData,
                )
            })
        } finally {
            session?.free()
        }
    }

    /** */
    public async addHybridGroupSession(streamId: string, sessionId: string, sessionKey: string) {
        const sessionKeyBytes = bin_fromHexString(sessionKey)
        const session = fromBinary(HybridGroupSessionKeySchema, sessionKeyBytes)
        if (bin_toHexString(session.streamId) !== streamId) {
            throw new Error(`Stream ID mismatch for hybrid group session ${streamId}`)
        }
        if (bin_toHexString(session.sessionId) !== sessionId) {
            throw new Error(`Session ID mismatch for hybrid group session ${sessionId}`)
        }
        const expectedSessionPromise = hybridSessionKeyHashVodozemac(
            session.streamId,
            session.key,
            session.miniblockNum,
            session.miniblockHash,
        )
        const expectedSessionId = await Dexie.waitFor(expectedSessionPromise)
        if (!bin_equal(expectedSessionId, bin_fromHexString(sessionId))) {
            throw new Error(
                `Session ID mismatch for hybrid group session ${sessionId} expected ${bin_toHexString(
                    expectedSessionId,
                )}`,
            )
        }
        await this.cryptoStore.withGroupSessions(async () => {
            await this.cryptoStore.storeHybridGroupSession({
                sessionId,
                streamId,
                sessionKey: sessionKeyBytes,
                miniblockNum: session.miniblockNum,
            })
        })
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
        return await this.cryptoStore.withGroupSessions(async () => {
            log(`encrypting msg with group session for stream id ${streamId}`)

            checkPayloadLength(payloadString, { streamId, source: 'encryptGroupMessage' })
            const session = await this.getOutboundGroupSession(streamId)
            const ciphertext = session.encrypt(payloadString)
            const sessionId = session.session_id
            await this.saveOutboundGroupSession(session, streamId)
            session.free()
            return { ciphertext, sessionId }
        })
    }

    public async encryptUsingFallbackKey(
        theirIdentityKey: string,
        fallbackKey: string,
        payload: string,
    ): Promise<{ type: 0 | 1; body: string }> {
        checkPayloadLength(payload, { source: 'encryptUsingFallbackKey' })
        return this.cryptoStore.withAccountTx(async () => {
            let session: Session | undefined
            try {
                const account = await this.getAccount()
                if (!account) {
                    throw new Error('no account?!')
                }
                session = account.create_outbound_session(
                    theirIdentityKey,
                    fallbackKey, // this should be a one-time key - does it matter?
                    SessionConfigVersion.V1,
                )
                const result = session.encrypt(payload)
                return {
                    type: result.message_type as 0 | 1,
                    body: bin_toHexString(result.ciphertext),
                }
            } catch (error) {
                log('Error encrypting message with fallback key', error)
                throw error
            } finally {
                if (session) {
                    session.free()
                }
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
        ciphertext: string,
        theirDeviceIdentityKey: string,
        messageType: number = 0,
    ): Promise<string> {
        if (messageType !== 0) {
            throw new Error('Only pre-key messages supported')
        }

        checkPayloadLength(ciphertext, { source: 'decryptMessage' })
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return await this.cryptoStore.withAccountTx(async () => {
            const account = await this.getAccount()
            // TODO: we could optimize js bindings to avoid the need to convert the ciphertext to a Uint8Array
            const message = new OlmMessage(messageType, bin_fromBase64(ciphertext))
            try {
                const { plaintext, session } = account.create_inbound_session(
                    theirDeviceIdentityKey,
                    message,
                )
                log('Session ID ' + session.session_id + ' from ' + theirDeviceIdentityKey)
                await this.storeAccount(account)
                return plaintext
            } catch (e) {
                throw new Error(
                    'Error decrypting prekey message: ' + JSON.stringify((<Error>e).message),
                )
            }
        })
    }

    // Group Sessions

    public async getInboundGroupSessionIds(streamId: string): Promise<string[]> {
        return await this.cryptoStore.getInboundGroupSessionIds(streamId)
    }

    public async getHybridGroupSessionIds(streamId: string): Promise<string[]> {
        return await this.cryptoStore.getHybridGroupSessionIds(streamId)
    }

    /**
     * Determine if we have the keys for a given group session
     *
     * @param streamId - stream in which the message was received
     * @param senderKey - base64-encoded curve25519 key of the sender
     * @param sessionId - session identifier
     */
    public async hasInboundSessionKeys(streamId: string, sessionId: string): Promise<boolean> {
        const sessionData = await this.cryptoStore.withGroupSessions(async () => {
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

    /** */
    public async hasHybridGroupSessionKey(streamId: string, sessionId: string): Promise<boolean> {
        const key = await this.cryptoStore.getHybridGroupSession(streamId, sessionId)
        return key !== undefined
    }

    /**
     * Export an inbound group session
     *
     * @param streamId - streamId of session
     * @param sessionId  - session identifier
     */
    public async exportInboundGroupSession(
        streamId: string,
        sessionId: string,
    ): Promise<GroupEncryptionSession | undefined> {
        const sessionData = await this.cryptoStore.getEndToEndInboundGroupSession(
            streamId,
            sessionId,
        )
        if (!sessionData) {
            return undefined
        }

        const session = this.unpickleInboundGroupSession(sessionData)
        const messageIndex = session.first_known_index
        const sessionKey = session.export_at(messageIndex)
        session.free()

        if (!sessionKey) {
            return undefined
        }

        return {
            streamId: streamId,
            sessionId: sessionId,
            sessionKey: sessionKey,
            algorithm: GroupEncryptionAlgorithmId.GroupEncryption,
        }
    }

    /** */
    public async exportHybridGroupSession(
        streamId: string,
        sessionId: string,
    ): Promise<GroupEncryptionSession | undefined> {
        const sessionData = await this.cryptoStore.getHybridGroupSession(streamId, sessionId)
        if (!sessionData) {
            return undefined
        }
        return {
            streamId: streamId,
            sessionId: sessionId,
            sessionKey: bin_toHexString(sessionData.sessionKey),
            algorithm: GroupEncryptionAlgorithmId.HybridGroupEncryption,
        }
    }

    /**
     * Get a list containing all of the room keys
     *
     * @returns a list of session export objects
     */
    public async exportInboundGroupSessions(): Promise<GroupEncryptionSession[]> {
        const exportedSessions: GroupEncryptionSession[] = []

        await this.cryptoStore.withGroupSessions(async () => {
            const sessions = await this.cryptoStore.getAllEndToEndInboundGroupSessions()
            for (const sessionData of sessions) {
                if (!sessionData) {
                    continue
                }

                const session = this.unpickleInboundGroupSession(sessionData)
                const messageIndex = session.first_known_index
                const sessionKey = session.export_at(messageIndex)
                session.free()

                if (!sessionKey) {
                    continue
                }

                exportedSessions.push({
                    streamId: sessionData.stream_id,
                    sessionId: sessionData.sessionId,
                    sessionKey: sessionKey,
                    algorithm: GroupEncryptionAlgorithmId.GroupEncryption,
                })
            }
        })

        return exportedSessions
    }

    public async exportHybridGroupSessions(): Promise<GroupEncryptionSession[]> {
        const sessions = await this.cryptoStore.getAllHybridGroupSessions()
        return sessions.map((session: HybridGroupSessionRecord): GroupEncryptionSession => {
            return {
                streamId: session.streamId,
                sessionId: session.sessionId,
                sessionKey: bin_toHexString(session.sessionKey),
                algorithm: GroupEncryptionAlgorithmId.HybridGroupEncryption,
            }
        })
    }
}

const hybridSessionKeyHashPrefixBytes = new TextEncoder().encode('RVR_HSK:')

// TODO: needs unit tests
export async function hybridSessionKeyHashVodozemac(
    streamId: Uint8Array,
    key: Uint8Array,
    miniblockNum: bigint,
    miniblockHash: Uint8Array,
): Promise<Uint8Array> {
    const length =
        hybridSessionKeyHashPrefixBytes.length +
        streamId.length +
        key.length +
        8 +
        miniblockHash.length

    const bytes = new ArrayBuffer(length)

    const dataView = new DataView(bytes)
    const arrayView = new Uint8Array(bytes)
    arrayView.set(hybridSessionKeyHashPrefixBytes)
    let offset = hybridSessionKeyHashPrefixBytes.length
    arrayView.set(streamId, offset)
    offset += streamId.length
    arrayView.set(key, offset)
    offset += key.length
    dataView.setBigUint64(offset, miniblockNum)
    offset += 8
    arrayView.set(miniblockHash, offset)
    offset += miniblockHash.length
    if (offset !== length) {
        throw new Error(`Final offset ${offset} does not match expected length ${length}`)
    }

    const hashBytes = await crypto.subtle.digest('SHA-256', bytes)
    return new Uint8Array(hashBytes)
}
