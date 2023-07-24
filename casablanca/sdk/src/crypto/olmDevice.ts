// todo: fix lint issues and remove exception see: https://linear.app/hnt-labs/issue/HNT-1721/address-linter-overrides-in-matrix-encryption-code-from-sdk
/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unused-vars, @typescript-eslint/no-unsafe-argument*/

import { dlog } from '../dlog'
import { MegolmSession } from '@towns/proto'
import { IndexedDBCryptoStore } from './store/indexeddb-crypto-store'
import { CryptoStore, CryptoTxn, ISessionInfo } from './store/base'
import { IMessage } from './olmLib'
import { OlmMegolmDelegate, Account, Utility, Session } from '@towns/mecholm'

const log = dlog('csb:olmDevice')

// The maximum size of an event is 65K, and we base64 the content, so this is a
// reasonable approximation to the biggest plaintext we can encrypt.
const MAX_PLAINTEXT_LENGTH = (65536 * 3) / 4

/** data stored in the session store about an inbound group session */
export interface InboundGroupSessionData {
    room_id: string // eslint-disable-line camelcase
    /** pickled Olm.InboundGroupSession */
    session: string
    keysClaimed: Record<string, string>
    /** Devices involved in forwarding this session to us (normally empty). */
    forwardingCurve25519KeyChain: string[]
    /** whether this session is untrusted. */
    untrusted?: boolean
    /** whether this session exists during the room being set to shared history. */
    sharedHistory?: boolean
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

export interface IInboundSession {
    payload: string
    session_id: string
}

interface IUnpickledSessionInfo extends Omit<ISessionInfo, 'session'> {
    session: Session
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

interface Extensible {
    [key: string]: any
}
export interface IMegolmSessionData extends Extensible {
    /** Sender's Curve25519 device key */
    sender_key: string
    /** Devices which forwarded this session to us (normally empty). */
    forwarding_curve25519_key_chain: string[]
    /** Other keys the sender claims. */
    sender_claimed_keys: Record<string, string>
    space_id: string
    channel_id?: string
    /** Unique id for the session */
    session_id: string
    /** Base64'ed key data */
    session_key: string
    algorithm?: string
    untrusted?: boolean
}

//type FallbackKeys = { curve25519: { [keyId: string]: string } }

export class OlmDevice {
    public pickleKey = 'DEFAULT_KEY' // set by consumers

    /** Curve25519 key for the account, unknown until we load the account from storage in init() */
    public deviceCurve25519Key: string | null = null
    /** Ed25519 key for the account, unknown until we load the account from storage in init() */
    public deviceDoNotUseKey: string | null = null
    // keyId: base64(key)
    public fallbackKey: Record<string, string> = {}

    // Keep track of sessions that we're starting, so that we don't start
    // multiple sessions for the same device at the same time.
    public sessionsInProgress: Record<string, Promise<void>> = {} // set by consumers

    // Used by olm to serialise prekey message decryptions
    // todo: ensure we need this to serialize prekey message given we're using fallback keys
    // not one time keys, which suffer a race condition and expire once used.
    public olmPrekeyPromise: Promise<any> = Promise.resolve() // set by consumers

    public constructor(
        private readonly cryptoStore: CryptoStore,
        private olmDelegate: OlmMegolmDelegate,
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
            e2eKeys = JSON.parse(account.identity_keys())
        } finally {
            account.free()
        }
        try {
            await this.generateFallbackKey()
            // fallback key { keyId: base64(key) }
            this.fallbackKey = (await this.getFallbackKey()).curve25519
        } catch (e) {
            log(`Error generating fallback key: ${JSON.stringify(e)}`)
        }

        this.deviceCurve25519Key = e2eKeys.curve25519
        // note jterzis 07/19/23: deprecating ed25519 key in favor of TDK
        // see: https://linear.app/hnt-labs/issue/HNT-1796/tdk-signature-storage-curve25519-key
        this.deviceDoNotUseKey = e2eKeys.ed25519
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
        await this.cryptoStore.doTxn(
            'readwrite',
            [IndexedDBCryptoStore.STORE_ACCOUNT, IndexedDBCryptoStore.STORE_SESSIONS],
            (txn) => {
                this.cryptoStore.storeAccount(txn, exportedData.pickledAccount)
                exportedData.sessions.forEach((session) => {
                    const { deviceKey, sessionId } = session
                    const sessionInfo = {
                        session: session.session,
                        lastReceivedMessageTs: session.lastReceivedMessageTs,
                    }
                    if (deviceKey && sessionId) {
                        this.cryptoStore.storeEndToEndSession(
                            deviceKey,
                            sessionId,
                            sessionInfo,
                            txn,
                        )
                    }
                })
            },
        )
        account.unpickle(this.pickleKey, exportedData.pickledAccount)
    }

    private async initializeAccount(account: Account): Promise<void> {
        await this.cryptoStore.doTxn('readwrite', [IndexedDBCryptoStore.STORE_ACCOUNT], (txn) => {
            this.cryptoStore.getAccount(txn, (pickledAccount) => {
                if (pickledAccount !== null) {
                    account.unpickle(this.pickleKey, pickledAccount)
                } else {
                    account.create()
                    pickledAccount = account.pickle(this.pickleKey)
                    this.cryptoStore.storeAccount(txn, pickledAccount)
                }
            })
        })
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
    private getAccount(txn: CryptoTxn, func: (account: Account) => void): void {
        this.cryptoStore.getAccount(txn, (pickledAccount: string | null) => {
            const account = this.olmDelegate.createAccount()
            try {
                account.unpickle(this.pickleKey, pickledAccount!)
                func(account)
            } finally {
                account.free()
            }
        })
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
    private storeAccount(txn: CryptoTxn, account: Account): void {
        this.cryptoStore.storeAccount(txn, account.pickle(this.pickleKey))
    }

    /**
     * Export data for re-creating the Olm device later.
     * TODO export data other than just account and (P2P) sessions.
     *
     * @returns The exported data
     */
    public async export(): Promise<IExportedDevice> {
        const result: Partial<IExportedDevice> = {
            pickleKey: this.pickleKey,
        }

        await this.cryptoStore.doTxn(
            'readonly',
            [IndexedDBCryptoStore.STORE_ACCOUNT, IndexedDBCryptoStore.STORE_SESSIONS],
            (txn) => {
                this.cryptoStore.getAccount(txn, (pickledAccount: string | null) => {
                    result.pickledAccount = pickledAccount!
                })
                result.sessions = []
                // Note that the pickledSession object we get in the callback
                // is not exactly the same thing you get in method _getSession
                // see documentation of IndexedDBCryptoStore.getAllEndToEndSessions
                this.cryptoStore.getAllEndToEndSessions(txn, (pickledSession) => {
                    result.sessions!.push(pickledSession!)
                })
            },
        )
        return result as IExportedDevice
    }

    /**
     * extract an OlmSession from the session store and call the given function
     * The session is usable only within the callback passed to this
     * function and will be freed as soon the callback returns. It is *not*
     * usable for the rest of the lifetime of the transaction.
     *
     * @param txn - Opaque transaction object from cryptoStore.doTxn()
     * @internal
     */
    private getSession(
        deviceKey: string,
        sessionId: string,
        txn: CryptoTxn,
        func: (unpickledSessionInfo: IUnpickledSessionInfo) => void,
    ): void {
        this.cryptoStore.getEndToEndSession(
            deviceKey,
            sessionId,
            txn,
            (sessionInfo: ISessionInfo | null) => {
                this.unpickleSession(sessionInfo!, func)
            },
        )
    }

    /**
     * Creates a session object from a session pickle and executes the given
     * function with it. The session object is destroyed once the function
     * returns.
     *
     * @internal
     */
    private unpickleSession(
        sessionInfo: ISessionInfo,
        func: (unpickledSessionInfo: IUnpickledSessionInfo) => void,
    ): void {
        const session = this.olmDelegate.createSession()
        try {
            session.unpickle(this.pickleKey, sessionInfo.session!)
            const unpickledSessInfo: IUnpickledSessionInfo = Object.assign({}, sessionInfo, {
                session,
            })

            func(unpickledSessInfo)
        } finally {
            session.free()
        }
    }

    /**
     * Store our OlmSession in the session store
     *
     * @param sessionInfo - `{session: OlmSession, lastReceivedMessageTs: int}`
     * @param txn - Opaque transaction object from cryptoStore.doTxn()
     * @internal
     */
    private saveSession(
        deviceKey: string,
        sessionInfo: IUnpickledSessionInfo,
        txn: CryptoTxn,
    ): void {
        const sessionId = sessionInfo.session.session_id()
        log(
            `Saving Olm session ${sessionId} with device ${deviceKey}: ${sessionInfo.session.describe()}`,
        )

        // Why do we re-use the input object for this, overwriting the same key with a different
        // type? Is it because we want to erase the unpickled session to enforce that it's no longer
        // used? A comment would be great.
        const pickledSessionInfo = Object.assign(sessionInfo, {
            session: sessionInfo.session.pickle(this.pickleKey),
        })
        this.cryptoStore.storeEndToEndSession(deviceKey, sessionId, pickledSessionInfo, txn)
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
        let result: string
        await this.cryptoStore.doTxn('readonly', [IndexedDBCryptoStore.STORE_ACCOUNT], (txn) => {
            this.getAccount(txn, (account: Account) => {
                result = account.sign(message)
            })
        })
        return result!
    }

    /**
     * Marks all of the fallback keys as published.
     */
    public async markKeysAsPublished(): Promise<void> {
        await this.cryptoStore.doTxn('readwrite', [IndexedDBCryptoStore.STORE_ACCOUNT], (txn) => {
            this.getAccount(txn, (account: Account) => {
                account.mark_keys_as_published()
                this.storeAccount(txn, account)
            })
        })
    }

    /**
     * Generate a new fallback keys
     *
     * @returns Resolved once the account is saved back having generated the key
     */
    public async generateFallbackKey(): Promise<void> {
        await this.cryptoStore.doTxn('readwrite', [IndexedDBCryptoStore.STORE_ACCOUNT], (txn) => {
            this.getAccount(txn, (account) => {
                account.generate_fallback_key()
                this.storeAccount(txn, account)
            })
        })
    }

    public async getFallbackKey(): Promise<Record<string, Record<string, string>>> {
        let result: Record<string, Record<string, string>> = {}
        await this.cryptoStore.doTxn('readonly', [IndexedDBCryptoStore.STORE_ACCOUNT], (txn) => {
            this.getAccount(txn, (account: Account) => {
                result = JSON.parse(account.unpublished_fallback_key())
            })
        })
        return result
    }

    public async forgetOldFallbackKey(): Promise<void> {
        await this.cryptoStore.doTxn('readwrite', [IndexedDBCryptoStore.STORE_ACCOUNT], (txn) => {
            this.getAccount(txn, (account: Account) => {
                account.forget_old_fallback_key()
                this.storeAccount(txn, account)
            })
        })
    }

    /**
     * Generate a new outbound session
     *
     * The new session will be stored in the cryptoStore.
     *
     * @param theirIdentityKey - remote user's Curve25519 identity key
     * @param theirOneTimeKey -  remote user's one-time Curve25519 key
     * @returns sessionId for the outbound session.
     */
    public async createOutboundSession(
        theirIdentityKey: string,
        theirOneTimeKey: string,
    ): Promise<string> {
        let newSessionId: string
        await this.cryptoStore.doTxn(
            'readwrite',
            [IndexedDBCryptoStore.STORE_ACCOUNT, IndexedDBCryptoStore.STORE_SESSIONS],
            (txn) => {
                this.getAccount(txn, (account: Account) => {
                    const session = this.olmDelegate.createSession()
                    try {
                        session.create_outbound(account, theirIdentityKey, theirOneTimeKey)
                        newSessionId = session.session_id()
                        this.storeAccount(txn, account)
                        const sessionInfo: IUnpickledSessionInfo = {
                            session,
                            // Pretend we've received a message at this point, otherwise
                            // if we try to send a message to the device, it won't use
                            // this session
                            lastReceivedMessageTs: Date.now(),
                        }
                        this.saveSession(theirIdentityKey, sessionInfo, txn)
                    } finally {
                        session.free()
                    }
                })
            },
            undefined,
        )
        return newSessionId!
    }

    /**
     * Generate a new inbound session, given an incoming message
     *
     * @param theirDeviceIdentityKey - remote user's Curve25519 identity key
     * @param messageType -  messageType field from the received message (must be 0)
     * @param ciphertext - base64-encoded body from the received message
     *
     * @returns decrypted payload, and
     *     session id of new session
     *
     * @throws Error if the received message was not valid (for instance, it didn't use a valid one-time key).
     */
    public async createInboundSession(
        theirDeviceIdentityKey: string,
        messageType: number,
        ciphertext: string,
    ): Promise<IInboundSession> {
        if (messageType !== 0) {
            throw new Error('Need messageType == 0 to create inbound session')
        }

        let result: { payload: string; session_id: string } // eslint-disable-line camelcase
        await this.cryptoStore.doTxn(
            'readwrite',
            [IndexedDBCryptoStore.STORE_ACCOUNT, IndexedDBCryptoStore.STORE_SESSIONS],
            (txn) => {
                this.getAccount(txn, (account: Account) => {
                    const session = this.olmDelegate.createSession()
                    try {
                        session.create_inbound_from(account, theirDeviceIdentityKey, ciphertext)
                        account.remove_one_time_keys(session)
                        this.storeAccount(txn, account)

                        const payloadString = session.decrypt(messageType, ciphertext)

                        const sessionInfo: IUnpickledSessionInfo = {
                            session,
                            // this counts as a received message: set last received message time
                            // to now
                            lastReceivedMessageTs: Date.now(),
                        }
                        this.saveSession(theirDeviceIdentityKey, sessionInfo, txn)

                        result = {
                            payload: payloadString,
                            session_id: session.session_id(),
                        }
                    } finally {
                        session.free()
                    }
                })
            },
            undefined,
        )

        return result!
    }

    /**
     * Get a list of known session IDs for the given device
     *
     * @param theirDeviceIdentityKey - Curve25519 identity key for the
     *     remote device
     * @returns  a list of known session ids for the device
     */
    public async getSessionIdsForDevice(theirDeviceIdentityKey: string): Promise<string[]> {
        if (theirDeviceIdentityKey in this.sessionsInProgress) {
            log(`waiting for Olm session for ${theirDeviceIdentityKey} to be created`)
            try {
                await this.sessionsInProgress[theirDeviceIdentityKey]
            } catch (e) {
                // if the session failed to be created, just fall through and
                // return an empty result
            }
        }
        let sessionIds: string[]
        await this.cryptoStore.doTxn(
            'readonly',
            [IndexedDBCryptoStore.STORE_SESSIONS],
            (txn) => {
                this.cryptoStore.getEndToEndSessions(theirDeviceIdentityKey, txn, (sessions) => {
                    sessionIds = Object.keys(sessions)
                })
            },
            undefined,
        )

        return sessionIds!
    }

    /**
     * Get the right olm session id for encrypting messages to the given identity key
     *
     * @param theirDeviceIdentityKey - Curve25519 identity key for the
     *     remote device
     * @param nowait - Don't wait for an in-progress session to complete.
     *     This should only be set to true of the calling function is the function
     *     that marked the session as being in-progress.
     * @returns  session id, or null if no established session
     */
    public async getSessionIdForDevice(
        theirDeviceIdentityKey: string,
        nowait = false,
    ): Promise<string | null> {
        const sessionInfos = await this.getSessionInfoForDevice(theirDeviceIdentityKey, nowait)

        if (sessionInfos.length === 0) {
            return null
        }
        // Use the session that has most recently received a message
        let idxOfBest = 0
        for (let i = 1; i < sessionInfos.length; i++) {
            const thisSessInfo = sessionInfos[i]
            const thisLastReceived =
                thisSessInfo.lastReceivedMessageTs === undefined
                    ? 0
                    : thisSessInfo.lastReceivedMessageTs

            const bestSessInfo = sessionInfos[idxOfBest]
            const bestLastReceived =
                bestSessInfo.lastReceivedMessageTs === undefined
                    ? 0
                    : bestSessInfo.lastReceivedMessageTs
            if (
                thisLastReceived > bestLastReceived ||
                (thisLastReceived === bestLastReceived &&
                    thisSessInfo.sessionId < bestSessInfo.sessionId)
            ) {
                idxOfBest = i
            }
        }
        return sessionInfos[idxOfBest].sessionId
    }

    /**
     * Get information on the active Olm sessions for a device.
     * <p>
     * Returns an array, with an entry for each active session. The first entry in
     * the result will be the one used for outgoing messages. Each entry contains
     * the keys 'hasReceivedMessage' (true if the session has received an incoming
     * message and is therefore past the pre-key stage), and 'sessionId'.
     *
     * @param deviceIdentityKey - Curve25519 identity key for the device
     * @param nowait - Don't wait for an in-progress session to complete.
     *     This should only be set to true of the calling function is the function
     *     that marked the session as being in-progress.
     */
    public async getSessionInfoForDevice(
        deviceIdentityKey: string,
        nowait = false,
    ): Promise<
        { sessionId: string; lastReceivedMessageTs: number; hasReceivedMessage: boolean }[]
    > {
        if (deviceIdentityKey in this.sessionsInProgress && !nowait) {
            log(`Waiting for Olm session for ${deviceIdentityKey} to be created`)
            try {
                await this.sessionsInProgress[deviceIdentityKey]
            } catch (e) {
                // if the session failed to be created, then just fall through and
                // return an empty result
            }
        }
        const info: {
            lastReceivedMessageTs: number
            hasReceivedMessage: boolean
            sessionId: string
        }[] = []

        await this.cryptoStore.doTxn(
            'readonly',
            [IndexedDBCryptoStore.STORE_SESSIONS],
            (txn) => {
                this.cryptoStore.getEndToEndSessions(deviceIdentityKey, txn, (sessions) => {
                    const sessionIds = Object.keys(sessions).sort()
                    for (const sessionId of sessionIds) {
                        this.unpickleSession(
                            sessions[sessionId],
                            (sessInfo: IUnpickledSessionInfo) => {
                                info.push({
                                    lastReceivedMessageTs: sessInfo.lastReceivedMessageTs!,
                                    hasReceivedMessage: sessInfo.session.has_received_message(),
                                    sessionId,
                                })
                            },
                        )
                    }
                })
            },
            undefined,
        )

        return info
    }

    /**
     * Encrypt an outgoing message using an existing session
     *
     * @param theirDeviceIdentityKey - Curve25519 identity key for the
     *     remote device
     * @param sessionId -  the id of the active session
     * @param payloadString -  payload to be encrypted and sent
     *
     * @returns ciphertext
     */
    public async encryptMessage(
        theirDeviceIdentityKey: string,
        sessionId: string,
        payloadString: string,
    ): Promise<IMessage> {
        checkPayloadLength(payloadString)
        let res: IMessage = { body: '' }
        await this.cryptoStore.doTxn(
            'readwrite',
            [IndexedDBCryptoStore.STORE_SESSIONS],
            (txn) => {
                this.getSession(theirDeviceIdentityKey, sessionId, txn, (sessionInfo) => {
                    const sessionDesc = sessionInfo.session.describe()
                    log(
                        'Olm Session ID ' +
                            sessionId +
                            ' to ' +
                            theirDeviceIdentityKey +
                            ': ' +
                            sessionDesc,
                    )
                    res = sessionInfo.session.encrypt(payloadString)
                    this.saveSession(theirDeviceIdentityKey, sessionInfo, txn)
                })
            },
            undefined,
        )
        return res
    }

    /**
     * Decrypt an incoming message using an existing session
     *
     * @param theirDeviceIdentityKey - Curve25519 identity key for the
     *     remote device
     * @param sessionId -  the id of the active session
     * @param messageType -  messageType field from the received message
     * @param ciphertext - base64-encoded body from the received message
     *
     * @returns decrypted payload.
     */
    public async decryptMessage(
        theirDeviceIdentityKey: string,
        sessionId: string,
        messageType: number,
        ciphertext: string,
    ): Promise<string> {
        let payloadString: string
        await this.cryptoStore.doTxn(
            'readwrite',
            [IndexedDBCryptoStore.STORE_SESSIONS],
            (txn) => {
                this.getSession(
                    theirDeviceIdentityKey,
                    sessionId,
                    txn,
                    (sessionInfo: IUnpickledSessionInfo) => {
                        const sessionDesc = sessionInfo.session.describe()
                        log(
                            'Olm Session ID ' +
                                sessionId +
                                ' from ' +
                                theirDeviceIdentityKey +
                                ': ' +
                                sessionDesc,
                        )
                        payloadString = sessionInfo.session.decrypt(messageType, ciphertext)
                        sessionInfo.lastReceivedMessageTs = Date.now()
                        this.saveSession(theirDeviceIdentityKey, sessionInfo, txn)
                    },
                )
            },
            undefined,
        )
        return payloadString!
    }

    /**
     * Determine if an incoming messages is a prekey message matching an existing session
     *
     * @param theirDeviceIdentityKey - Curve25519 identity key for the
     *     remote device
     * @param sessionId -  the id of the active session
     * @param messageType -  messageType field from the received message
     * @param ciphertext - base64-encoded body from the received message
     *
     * @returns true if the received message is a prekey message which matches
     *    the given session.
     */
    public async matchesSession(
        theirDeviceIdentityKey: string,
        sessionId: string,
        messageType: number,
        ciphertext: string,
    ): Promise<boolean> {
        if (messageType !== 0) {
            return false
        }

        let matches: boolean
        await this.cryptoStore.doTxn(
            'readonly',
            [IndexedDBCryptoStore.STORE_SESSIONS],
            (txn) => {
                this.getSession(theirDeviceIdentityKey, sessionId, txn, (sessionInfo) => {
                    matches = sessionInfo.session.matches_inbound(ciphertext)
                })
            },
            undefined,
        )
        return matches!
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

    public async getSharedHistoryInboundGroupSessions(
        _roomId: string,
    ): Promise<[senderKey: string, sessionId: string][]> {
        return []
        // todo: implement
    }
    public async hasInboundSessionKeys(
        _roomId: string,
        _senderKey: string,
        _sessionId: string,
    ): Promise<boolean> {
        // todo: implement
        return false
    }

    public exportInboundGroupSession(
        _senderKey: string,
        _sessionId: string,
        _sessionData: InboundGroupSessionData,
    ): MegolmSession {
        // todo: implement
        return new MegolmSession()
    }
}
