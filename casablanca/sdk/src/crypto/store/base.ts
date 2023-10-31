import { IRoomKeyRequestBody, IRoomKeyRequestRecipient, RoomKeyRequestState } from '../crypto'
import { IOlmDevice, TrackingStatus } from '../deviceList'
import { InboundGroupSessionData } from '../olmDevice'
import { IDevice } from '../deviceInfo'
import { DLogger } from '../../dlog'

// transactions are assumed to be IDBTransactions or null for local storage, in-memory.
export type CryptoTxn = IDBTransaction | null

/**
 * Abstraction of artifacts that can store data required for e2e encryption
 *
 */
export interface CryptoStore {
    startup(): Promise<CryptoStore>
    deleteAllData(): Promise<void>
    deleteInboundGroupSessions(streamId: string, sessionId: string): Promise<void>
    getOrAddOutgoingRoomKeyRequest(request: OutgoingRoomKeyRequest): Promise<OutgoingRoomKeyRequest>
    getOutgoingRoomKeyRequest(
        requestBody: IRoomKeyRequestBody,
    ): Promise<OutgoingRoomKeyRequest | null>
    getOutgoingRoomKeyRequestByState(wantedStates: number[]): Promise<OutgoingRoomKeyRequest | null>
    getAllOutgoingRoomKeyRequestsByState(wantedState: number): Promise<OutgoingRoomKeyRequest[]>
    getOutgoingRoomKeyRequestsByTarget(
        userId: string,
        deviceId: string,
        wantedStates: number[],
    ): Promise<OutgoingRoomKeyRequest[]>
    updateOutgoingRoomKeyRequest(
        requestId: string,
        expectedState: number,
        updates: Partial<OutgoingRoomKeyRequest>,
    ): Promise<OutgoingRoomKeyRequest | null>
    deleteOutgoingRoomKeyRequest(
        requestId: string,
        expectedState: number,
    ): Promise<OutgoingRoomKeyRequest | null>

    // Olm Account
    getAccount(txn: CryptoTxn, func: (accountPickle: string | null) => void): void
    storeAccount(txn: CryptoTxn, accountPickle: string): void

    // Olm Sessions
    countEndToEndSessions(txn: CryptoTxn, func: (count: number) => void): void
    getEndToEndSession(
        deviceKey: string,
        sessionId: string,
        txn: CryptoTxn,
        func: (session: ISessionInfo | null) => void,
    ): void
    getEndToEndSessions(
        deviceKey: string,
        txn: CryptoTxn,
        func: (sessions: { [sessionId: string]: ISessionInfo }) => void,
    ): void
    getAllEndToEndSessions(txn: CryptoTxn, func: (session: ISessionInfo | null) => void): void
    storeEndToEndSession(
        deviceKey: string,
        sessionId: string,
        sessionInfo: ISessionInfo,
        txn: CryptoTxn | undefined,
    ): void
    storeEndToEndSessionProblem(deviceKey: string, type: string, fixed: boolean): Promise<void>
    getEndToEndSessionProblem(deviceKey: string, timestamp: number): Promise<IProblem | null>
    filterOutNotifiedErrorDevices(devices: IOlmDevice[]): Promise<IOlmDevice[]>

    // Inbound Group Sessions
    getEndToEndInboundGroupSession(
        streamId: string,
        sessionId: string,
        txn: CryptoTxn,
        func: (
            groupSession: InboundGroupSessionData | null,
            groupSessionWithheld: IWithheld | null,
        ) => void,
    ): void
    getAllEndToEndInboundGroupSessions(
        txn: CryptoTxn,
        func: (session: ISession | null) => void,
    ): void
    addEndToEndInboundGroupSession(
        streamId: string,
        sessionId: string,
        sessionData: InboundGroupSessionData,
        txn: CryptoTxn,
    ): void
    storeEndToEndInboundGroupSession(
        streamId: string,
        sessionId: string,
        sessionData: InboundGroupSessionData,
        txn: CryptoTxn,
    ): void
    storeEndToEndInboundGroupSessionWithheld(
        streamId: string,
        sessionId: string,
        sessionData: IWithheld,
        txn: CryptoTxn,
    ): void

    // Device Data
    getEndToEndDeviceData(txn: CryptoTxn, func: (deviceData: IDeviceData | null) => void): void
    storeEndToEndDeviceData(deviceData: IDeviceData, txn: CryptoTxn | undefined): void
    storeEndToEndRoom(channelId: string, roomInfo: IRoomEncryption, txn: CryptoTxn): void
    getEndToEndRooms(txn: CryptoTxn, func: (rooms: Record<string, IRoomEncryption>) => void): void
    getSessionsNeedingBackup(limit: number): Promise<ISession[]>
    countSessionsNeedingBackup(txn?: CryptoTxn): Promise<number>
    unmarkSessionsNeedingBackup(sessions: ISession[], txn?: CryptoTxn): Promise<void>
    markSessionsNeedingBackup(sessions: ISession[], txn?: CryptoTxn): Promise<void>
    addSharedHistoryInboundGroupSession(streamId: string, sessionId: string, txn?: CryptoTxn): void
    getSharedHistoryInboundGroupSessions(
        streamId: string,
        txn?: CryptoTxn,
    ): Promise<[streamId: string, sessionId: string][]>

    // Session key backups
    doTxn<T>(
        mode: Mode,
        stores: Iterable<string>,
        func: (txn: CryptoTxn) => T | Promise<T>,
        log?: DLogger,
    ): Promise<T>
}

export type Mode = 'readonly' | 'readwrite'

export interface IRoomEncryption {
    algorithm: string
    rotation_period_ms?: number
    rotation_period_msgs?: number
}

export interface IDeviceData {
    devices: {
        [userId: string]: {
            [deviceId: string]: IDevice
        }
    }
    trackingStatus: {
        [userId: string]: TrackingStatus
    }
    // leaving out crossSigningInfo as cross-signing in general is not yet implemented
    syncToken?: string
}

export interface ISession {
    streamId: string
    sessionId: string
    sessionData?: InboundGroupSessionData
}

export interface IWithheld {
    stream_id: string
    code: string
    reason: string
}

export interface IProblem {
    type: string
    fixed: boolean
    time: number
}

export interface ISessionInfo {
    deviceKey?: string
    sessionId?: string
    session?: string
    lastReceivedMessageTs?: number
}

/**
 * Represents an outgoing room key request
 */
export interface OutgoingRoomKeyRequest {
    /**
     * Unique id for this request. Used for both an id within the request for later pairing with a cancellation,
     * and for the transaction id when sending the to_device messages to our local server.
     */
    requestId: string
    requestTxnId?: string
    /**
     * Transaction id for the cancellation, if any
     */
    cancellationTxnId?: string
    /**
     * List of recipients for the request
     */
    recipients: IRoomKeyRequestRecipient[]
    /**
     * Parameters for the request
     */
    requestBody: IRoomKeyRequestBody
    /**
     * current state of this request
     */
    state: RoomKeyRequestState
}
