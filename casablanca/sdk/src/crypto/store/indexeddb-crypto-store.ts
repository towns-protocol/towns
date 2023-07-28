import {
    CryptoStore,
    IDeviceData,
    IProblem,
    IRoomEncryption,
    ISession,
    ISessionInfo,
    IWithheld,
    Mode,
    OutgoingRoomKeyRequest,
} from './base'
import { DLogger, dlog } from '../../dlog'
import { IRoomKeyRequestBody } from '../crypto'
import { IOlmDevice } from '../deviceList'
import { InboundGroupSessionData } from '../olmDevice'
import { LocalStorageCryptoStore } from './local-storage-crypto-store'
import { MemoryCryptoStore } from './memory-crypto-store'
import * as IndexedDBCryptoStoreBackend from './indexeddb-crypto-store-backend'
import { RK, RDK } from '../rk'

const log = dlog('csb:indexeddb-crypto-store')

// todo: fix lint issues and remove exception see: https://linear.app/hnt-labs/issue/HNT-1721/address-linter-overrides-in-matrix-encryption-code-from-sdk
/* eslint-disable @typescript-eslint/no-non-null-assertion, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/restrict-template-expressions, @typescript-eslint/no-unused-vars */

/**
 * IndexedDB Crypto Store for e2e encryption
 *
 * Implementation of CryptoStore, which is normally backed by IndexedDB,
 * but falls back to MemoryCryptoStore.
 */
export class IndexedDBCryptoStore implements CryptoStore {
    public static STORE_ACCOUNT = 'account'
    public static STORE_SESSIONS = 'sessions'
    public static STORE_INBOUND_GROUP_SESSIONS = 'inbound_group_sessions'
    public static STORE_INBOUND_GROUP_SESSIONS_WITHHELD = 'inbound_group_sessions_withheld'
    public static STORE_SHARED_HISTORY_INBOUND_GROUP_SESSIONS =
        'shared_history_inbound_group_sessions'
    public static STORE_PARKED_SHARED_HISTORY = 'parked_shared_history'
    public static STORE_DEVICE_DATA = 'device_data'
    public static STORE_ROOMS = 'rooms'
    public static STORE_BACKUP = 'sessions_needing_backup'
    public static STORE_RK = 'river_keys'

    public static exists(indexedDB: IDBFactory, dbName: string): Promise<boolean> {
        return exists(indexedDB, dbName)
    }

    private backendPromise?: Promise<CryptoStore>
    private backend?: CryptoStore

    /**
     * Create a new IndexedDBCryptoStore
     *
     */
    public constructor(
        private readonly indexedDB: IDBFactory | null,
        private readonly dbName: string,
        private readonly userId: string,
    ) {
        log('csb:sdk:store:indexeddb')
    }

    /**
     * Ensure the database exists and is up-to-date, or fall back to
     * a local storage or in-memory store.
     *
     * This must be called before the store can be used.
     *
     * @returns resolves to either an IndexedDBCryptoStoreBackend.Backend,
     * or a MemoryCryptoStore
     */
    public startup(): Promise<CryptoStore> {
        if (this.backendPromise) {
            return this.backendPromise
        }

        this.backendPromise = new Promise<CryptoStore>((resolve, reject) => {
            if (!this.indexedDB) {
                reject(new Error('no indexeddb support available'))
                return
            }

            log(`connecting to indexeddb ${this.dbName}`)

            const req = this.indexedDB.open(this.dbName, IndexedDBCryptoStoreBackend.VERSION)

            req.onupgradeneeded = (ev): void => {
                const db = req.result
                const oldVersion = ev.oldVersion
                IndexedDBCryptoStoreBackend.upgradeDatabase(db, oldVersion)
            }

            req.onblocked = (): void => {
                log(`can't yet open IndexedDBCryptoStore because it is open elsewhere`)
            }

            req.onerror = (ev): void => {
                log('Error connecting to indexeddb', ev)
                reject(req.error)
            }

            req.onsuccess = (): void => {
                const db = req.result

                log(`connected to indexeddb ${this.dbName}`)
                const backend = new IndexedDBCryptoStoreBackend.Backend(db)
                resolve(backend)
            }
        })
            .then((backend) => {
                // Edge has IndexedDB but doesn't support compund keys which we use fairly extensively.
                // Try a dummy query which will fail if the browser doesn't support compund keys, so
                // we can fall back to a different backend.
                return backend
                    .doTxn(
                        'readonly',
                        [
                            IndexedDBCryptoStore.STORE_INBOUND_GROUP_SESSIONS,
                            IndexedDBCryptoStore.STORE_INBOUND_GROUP_SESSIONS_WITHHELD,
                        ],
                        (txn) => {
                            backend.getEndToEndInboundGroupSession('', '', txn, () => {})
                        },
                    )
                    .then(() => backend)
            })
            .catch((e) => {
                if (e.name === 'VersionError') {
                    log('Crypto DB is too new for us to use!', e)
                    // don't fall back to a different store: the user has crypto data
                    // in this db so we should use it or nothing at all.
                    throw new Error('Crypto DB is too new for us to use!')
                }
                log(
                    `unable to connect to indexeddb ${this.dbName}` +
                        `: falling back to localStorage store: ${e}`,
                )

                try {
                    return new LocalStorageCryptoStore(global.localStorage, this.userId)
                } catch (e) {
                    log(`unable to open localStorage: falling back to in-memory store: ${e}`)
                    return new MemoryCryptoStore()
                }
            })
            .then((backend) => {
                this.backend = backend
                return backend
            })

        return this.backendPromise
    }

    public cryptoStoreType(): string | undefined {
        return this.backend?.constructor.name
    }

    public deleteAllData(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            if (!this.indexedDB) {
                reject(new Error('no indexeddb support available'))
                return
            }

            console.log(`removing indexeddb instance ${this.dbName}`)
            const req = this.indexedDB.deleteDatabase(this.dbName)

            req.onblocked = () => {
                console.log(`can't yet delete indexeddb due to open connections`)
            }

            req.onerror = (e) => {
                console.log(`error deleting indexeddb instance ${this.dbName}: ${e}`)
                reject(req.error)
            }

            req.onsuccess = () => {
                console.log(`deleted indexeddb instance ${this.dbName}`)
                resolve()
            }
        }).catch((e) => {
            console.log(`unable to delete indexeddb instance ${this.dbName}: ${e}`)
        })
    }

    public deleteInboundGroupSessions(
        senderCurve25519Key: string,
        sessionId: string,
    ): Promise<void> {
        return this.backend!.deleteInboundGroupSessions(senderCurve25519Key, sessionId)
    }

    /**
     * Look for an existing outgoing room key request and if none is found,
     * add a new one.
     *
     */
    public getOrAddOutgoingRoomKeyRequest(
        request: OutgoingRoomKeyRequest,
    ): Promise<OutgoingRoomKeyRequest> {
        return this.backend!.getOrAddOutgoingRoomKeyRequest(request)
    }

    /**
     * Look for an existing outgoing room key request.
     */
    public getOutgoingRoomKeyRequest(
        req: IRoomKeyRequestBody,
    ): Promise<OutgoingRoomKeyRequest | null> {
        return this.backend!.getOutgoingRoomKeyRequest(req)
    }

    /**
     * Look for an existing room key request by state.
     *
     */
    public getOutgoingRoomKeyRequestByState(
        desiredStates: number[],
    ): Promise<OutgoingRoomKeyRequest | null> {
        return this.backend!.getOutgoingRoomKeyRequestByState(desiredStates)
    }

    /**
     * Look for room key requests by state.
     * Unlike getOutgoingRoomKeyRequestByState, this returns all entries in one state.
     *
     */
    public getAllOutgoingRoomKeyRequestsByState(
        desiredState: number,
    ): Promise<OutgoingRoomKeyRequest[]> {
        return this.backend!.getAllOutgoingRoomKeyRequestsByState(desiredState)
    }

    /**
     * Look for room key requests by target device and state.
     */
    public getOutgoingRoomKeyRequestsByTarget(
        userId: string,
        deviceId: string,
        desiredStates: number[],
    ): Promise<OutgoingRoomKeyRequest[]> {
        return this.backend!.getOutgoingRoomKeyRequestsByTarget(userId, deviceId, desiredStates)
    }

    /**
     * Look for an existing room key requesat by id and state and update it if found.
     *
     */
    public updateOutgoingRoomKeyRequest(
        requestId: string,
        expectedState: number,
        updates: Partial<OutgoingRoomKeyRequest>,
    ): Promise<OutgoingRoomKeyRequest | null> {
        return this.backend!.updateOutgoingRoomKeyRequest(requestId, expectedState, updates)
    }

    /**
     * Look for an existing room key request by id and state and delete it if found.
     *
     */
    public deleteOutgoingRoomKeyRequest(
        requestId: string,
        expectedState: number,
    ): Promise<OutgoingRoomKeyRequest | null> {
        return this.backend!.deleteOutgoingRoomKeyRequest(requestId, expectedState)
    }

    // Olm Account

    /**
     * Get the account pickle from the store. Requires an active transaction ( see doTxn()).
     *
     */
    public getAccount(tx: IDBTransaction, func: (accountPickle: string | null) => void): void {
        this.backend!.getAccount(tx, func)
    }

    /**
     * Write the account pickle to the store. Requires an active transaction ( see doTxn()).
     *
     */
    public storeAccount(tx: IDBTransaction, accountPickle: string): void {
        this.backend!.storeAccount(tx, accountPickle)
    }

    // Olm Sessions
    /**
     * Returns the number of end-to-end sessions in the store.
     *
     */
    public countEndToEndSessions(txn: IDBTransaction, func: (count: number) => void): void {
        this.backend!.countEndToEndSessions(txn, func)
    }

    /**
     * Retrieve a specific e2e session between a user and another device.
     *
     */
    public getEndToEndSession(
        deviceKey: string,
        sessionId: string,
        txn: IDBTransaction,
        func: (session: ISessionInfo | null) => void,
    ): void {
        this.backend!.getEndToEndSession(deviceKey, sessionId, txn, func)
    }

    /**
     * Retrieve the e2e sessions between a user and another device.
     */
    public getEndToEndSessions(
        deviceKey: string,
        txn: IDBTransaction,
        func: (sessions: Record<string, ISessionInfo>) => void,
    ): void {
        this.backend!.getEndToEndSessions(deviceKey, txn, func)
    }

    /**
     * Retrieve all end-to-end sessions in the store.
     */
    public getAllEndToEndSessions(
        tx: IDBTransaction,
        func: (session: ISessionInfo | null) => void,
    ): void {
        this.backend!.getAllEndToEndSessions(tx, func)
    }

    /**
     * Store e2e session between a user and another device.
     */
    public storeEndToEndSession(
        deviceKey: string,
        sessionId: string,
        sessionInfo: ISessionInfo,
        tx: IDBTransaction,
    ): void {
        this.backend!.storeEndToEndSession(deviceKey, sessionId, sessionInfo, tx)
    }

    public storeEndToEndSessionProblem(
        deviceKey: string,
        type: string,
        fixed: boolean,
    ): Promise<void> {
        return this.backend!.storeEndToEndSessionProblem(deviceKey, type, fixed)
    }

    public getEndToEndSessionProblem(
        deviceKey: string,
        timestamp: number,
    ): Promise<IProblem | null> {
        return this.backend!.getEndToEndSessionProblem(deviceKey, timestamp)
    }

    public filterOutNotifiedErrorDevices(devices: IOlmDevice[]): Promise<IOlmDevice[]> {
        return this.backend!.filterOutNotifiedErrorDevices(devices)
    }

    // Inbound Group Sessions

    /**
     * Retrieve the end-to-end inbound group session for a given
     * server key and session ID
     * @param senderCurve25519Key - The sender's curve 25519 key
     * @param sessionId - The ID of the session
     * @param txn - An active transaction. See doTxn().
     * @param func - Called with A map from sessionId
     *     to Base64 end-to-end session.
     */
    public getEndToEndInboundGroupSession(
        senderCurve25519Key: string,
        sessionId: string,
        txn: IDBTransaction,
        func: (
            groupSession: InboundGroupSessionData | null,
            groupSessionWithheld: IWithheld | null,
        ) => void,
    ): void {
        this.backend!.getEndToEndInboundGroupSession(senderCurve25519Key, sessionId, txn, func)
    }

    /**
     * Fetches all inbound group sessions in the store
     * @param txn - An active transaction. See doTxn().
     * @param func - Called once for each group session
     *     in the store with an object having keys `{senderKey, sessionId, sessionData}`,
     *     then once with null to indicate the end of the list.
     */
    public getAllEndToEndInboundGroupSessions(
        txn: IDBTransaction,
        func: (session: ISession | null) => void,
    ): void {
        this.backend!.getAllEndToEndInboundGroupSessions(txn, func)
    }

    /**
     * Adds an end-to-end inbound group session to the store.
     * If there already exists an inbound group session with the same
     * senderCurve25519Key and sessionID, the session will not be added.
     * @param senderCurve25519Key - The sender's curve 25519 key
     * @param sessionId - The ID of the session
     * @param sessionData - The session data structure
     * @param txn - An active transaction. See doTxn().
     */
    public addEndToEndInboundGroupSession(
        senderCurve25519Key: string,
        sessionId: string,
        sessionData: InboundGroupSessionData,
        txn: IDBTransaction,
    ): void {
        this.backend!.addEndToEndInboundGroupSession(
            senderCurve25519Key,
            sessionId,
            sessionData,
            txn,
        )
    }

    /**
     * Writes an end-to-end inbound group session to the store.
     * If there already exists an inbound group session with the same
     * senderCurve25519Key and sessionID, it will be overwritten.
     * @param senderCurve25519Key - The sender's curve 25519 key
     * @param sessionId - The ID of the session
     * @param sessionData - The session data structure
     * @param txn - An active transaction. See doTxn().
     */
    public storeEndToEndInboundGroupSession(
        senderCurve25519Key: string,
        sessionId: string,
        sessionData: InboundGroupSessionData,
        txn: IDBTransaction,
    ): void {
        this.backend!.storeEndToEndInboundGroupSession(
            senderCurve25519Key,
            sessionId,
            sessionData,
            txn,
        )
    }

    public storeEndToEndInboundGroupSessionWithheld(
        senderCurve25519Key: string,
        sessionId: string,
        sessionData: IWithheld,
        txn: IDBTransaction,
    ): void {
        this.backend!.storeEndToEndInboundGroupSessionWithheld(
            senderCurve25519Key,
            sessionId,
            sessionData,
            txn,
        )
    }

    // End-to-end device tracking

    /**
     * Store the state of all tracked devices
     * This contains devices for each user, a tracking state for each user
     * and a sync token matching the point in time the snapshot represents.
     * These all need to be written out in full each time such that the snapshot
     * is always consistent, so they are stored in one object.
     *
     */
    public storeEndToEndDeviceData(deviceData: IDeviceData, txn: IDBTransaction): void {
        this.backend!.storeEndToEndDeviceData(deviceData, txn)
    }

    /**
     * Get the state of all tracked devices
     *
     */
    public getEndToEndDeviceData(
        txn: IDBTransaction,
        func: (deviceData: IDeviceData | null) => void,
    ): void {
        this.backend!.getEndToEndDeviceData(txn, func)
    }

    // End to End Rooms

    /**
     * Store the end-to-end state for a room.
     */
    public storeEndToEndRoom(roomId: string, roomInfo: IRoomEncryption, txn: IDBTransaction): void {
        this.backend!.storeEndToEndRoom(roomId, roomInfo, txn)
    }

    /**
     * Get an object of `roomId->roomInfo` for all e2e rooms in the store
     */
    public getEndToEndRooms(
        txn: IDBTransaction,
        func: (rooms: Record<string, IRoomEncryption>) => void,
    ): void {
        this.backend!.getEndToEndRooms(txn, func)
    }

    // Session backups

    /**
     * Get the inbound group sessions that need to be backed up.
     */
    public getSessionsNeedingBackup(limit: number): Promise<ISession[]> {
        return this.backend!.getSessionsNeedingBackup(limit)
    }

    /**
     * Count the inbound group sessions that need to be backed up.
     */
    public countSessionsNeedingBackup(txn?: IDBTransaction): Promise<number> {
        return this.backend!.countSessionsNeedingBackup(txn)
    }

    /**
     * Unmark sessions as needing to be backed up.
     */
    public unmarkSessionsNeedingBackup(sessions: ISession[], txn?: IDBTransaction): Promise<void> {
        return this.backend!.unmarkSessionsNeedingBackup(sessions, txn)
    }

    /**
     * Mark sessions as needing to be backed up.
     */
    public markSessionsNeedingBackup(sessions: ISession[], txn?: IDBTransaction): Promise<void> {
        return this.backend!.markSessionsNeedingBackup(sessions, txn)
    }

    /**
     * Add a shared-history group session for a room.
     */
    public addSharedHistoryInboundGroupSession(
        roomId: string,
        senderKey: string,
        sessionId: string,
        txn?: IDBTransaction,
    ): void {
        this.backend!.addSharedHistoryInboundGroupSession(roomId, senderKey, sessionId, txn)
    }

    /**
     * Get the shared-history group session for a room.
     */
    public getSharedHistoryInboundGroupSessions(
        roomId: string,
        txn?: IDBTransaction,
    ): Promise<[senderKey: string, sessionId: string][]> {
        return this.backend!.getSharedHistoryInboundGroupSessions(roomId, txn)
    }

    /**
     * Perform a transaction on the crypto store. Any store methods
     * that require a transaction (txn) object to be passed in may
     * only be called within a callback of either this function or
     * one of the store functions operating on the same transaction.
     *
     * @param mode - 'readwrite' if you need to call setter
     *     functions with this transaction. Otherwise, 'readonly'.
     * @param stores - List IndexedDBCryptoStore.STORE_*
     *     options representing all types of object that will be
     *     accessed or written to with this transaction.
     * @param func - Function called with the
     *     transaction object: an opaque object that should be passed
     *     to store functions.
     * @param log - A possibly customised log
     * @returns Promise that resolves with the result of the `func`
     *     when the transaction is complete. If the backend is
     *     async (ie. the indexeddb backend) any of the callback
     *     functions throwing an exception will cause this promise to
     *     reject with that exception. On synchronous backends, the
     *     exception will propagate to the caller of the getFoo method.
     */
    public doTxn<T>(
        mode: Mode,
        stores: Iterable<string>,
        func: (txn: IDBTransaction) => T | Promise<T>,
        log?: DLogger,
    ): Promise<T> {
        return this.backend!.doTxn<T>(mode, stores, func as (txn: unknown) => T, log)
    }

    // rk storage

    public getRK<T>(txn: IDBTransaction, func: (rk: RK | null) => T): Promise<T> {
        return this.backend!.getRK(txn, func)
    }

    public getRDK<T>(txn: IDBTransaction, func: (rdk: RDK | null) => T): Promise<T> {
        return this.backend!.getRDK(txn, func)
    }

    public storeRK(txn: IDBTransaction, rk: RK): void {
        this.backend!.storeRK(txn, rk)
    }
    public storeRDK(txn: IDBTransaction, rdk: RDK): void {
        this.backend!.storeRDK(txn, rdk)
    }
}

/**
 * Check if an IndexedDB database exists. The only way to do so is to try opening it, so
 * we do that and then delete it did not exist before.
 *
 * @param indexedDB - The `indexedDB` interface
 * @param dbName - The database name to test for
 * @returns Whether the database exists
 */
export function exists(indexedDB: IDBFactory, dbName: string): Promise<boolean> {
    return new Promise<boolean>((resolve, reject) => {
        let exists = true
        const req = indexedDB.open(dbName)
        req.onupgradeneeded = (): void => {
            // Since we did not provide an explicit version when opening, this event
            // should only fire if the DB did not exist before at any version.
            exists = false
        }
        req.onblocked = (): void => reject(req.error)
        req.onsuccess = (): void => {
            const db = req.result
            db.close()
            if (!exists) {
                // The DB did not exist before, but has been created as part of this
                // existence check. Delete it now to restore previous state. Delete can
                // actually take a while to complete in some browsers, so don't wait for
                // it. This won't block future open calls that a store might issue next to
                // properly set up the DB.
                indexedDB.deleteDatabase(dbName)
            }
            resolve(exists)
        }
        req.onerror = (): void => reject(req.error)
    })
}
