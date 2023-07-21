import { IRoomKeyRequestBody, IRoomKeyRequestRecipient, RoomKeyRequestState } from '../crypto'
import { IOlmDevice, TrackingStatus } from '../deviceList'
import { InboundGroupSessionData } from '../olmDevice'
import { IDevice } from '../deviceInfo'
import { RK, RDK } from '../rk'
//import { RiverEvent } from '../../event'

/**
 * Abstraction of artifacts that can store data required for e2e encryption
 *
 */
export interface CryptoStore {
    startup(): Promise<CryptoStore>
    deleteAllData(): Promise<void>
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
    getAccount(txn: unknown, func: (accountPickle: string | null) => void): void
    storeAccount(txn: unknown, accountPickle: string): void

    // Olm Sessions
    countEndToEndSessions(txn: unknown, func: (count: number) => void): void
    getEndToEndSession(
        deviceKey: string,
        sessionId: string,
        txn: unknown,
        func: (session: ISessionInfo | null) => void,
    ): void
    getEndToEndSessions(
        deviceKey: string,
        txn: unknown,
        func: (sessions: { [sessionId: string]: ISessionInfo }) => void,
    ): void
    getAllEndToEndSessions(txn: unknown, func: (session: ISessionInfo | null) => void): void
    storeEndToEndSession(
        deviceKey: string,
        sessionId: string,
        sessionInfo: ISessionInfo,
        txn: unknown,
    ): void
    storeEndToEndSessionProblem(deviceKey: string, type: string, fixed: boolean): Promise<void>
    getEndToEndSessionProblem(deviceKey: string, timestamp: number): Promise<IProblem | null>
    filterOutNotifiedErrorDevices(devices: IOlmDevice[]): Promise<IOlmDevice[]>

    // Inbound Group Sessions
    getEndToEndInboundGroupSession(
        senderCurve25519Key: string,
        sessionId: string,
        txn: unknown,
        func: (
            groupSession: InboundGroupSessionData | null,
            groupSessionWithheld: IWithheld | null,
        ) => void,
    ): void
    getAllEndToEndInboundGroupSessions(txn: unknown, func: (session: ISession | null) => void): void
    addEndToEndInboundGroupSession(
        senderCurve25519Key: string,
        sessionId: string,
        sessionData: InboundGroupSessionData,
        txn: unknown,
    ): void
    storeEndToEndInboundGroupSession(
        senderCurve25519Key: string,
        sessionId: string,
        sessionData: InboundGroupSessionData,
        txn: unknown,
    ): void
    storeEndToEndInboundGroupSessionWithheld(
        senderCurve25519Key: string,
        sessionId: string,
        sessionData: IWithheld,
        txn: unknown,
    ): void

    // Device Data
    getEndToEndDeviceData(txn: unknown, func: (deviceData: IDeviceData | null) => void): void
    storeEndToEndDeviceData(deviceData: IDeviceData, txn: unknown): void
    storeEndToEndRoom(roomId: string, roomInfo: IRoomEncryption, txn: unknown): void
    getEndToEndRooms(txn: unknown, func: (rooms: Record<string, IRoomEncryption>) => void): void
    getSessionsNeedingBackup(limit: number): Promise<ISession[]>
    countSessionsNeedingBackup(txn?: unknown): Promise<number>
    unmarkSessionsNeedingBackup(sessions: ISession[], txn?: unknown): Promise<void>
    markSessionsNeedingBackup(sessions: ISession[], txn?: unknown): Promise<void>
    addSharedHistoryInboundGroupSession(
        roomId: string,
        senderKey: string,
        sessionId: string,
        txn?: unknown,
    ): void
    getSharedHistoryInboundGroupSessions(
        roomId: string,
        txn?: unknown,
    ): Promise<[senderKey: string, sessionId: string][]>

    // Session key backups
    doTxn<T>(mode: Mode, stores: Iterable<string>, func: (txn: unknown) => T, log?: any): Promise<T>

    // RK storage
    getRK(txn: unknown): Promise<RK | null>
    getRDK(txn: unknown): Promise<RDK | null>
    storeRK(txn: unknown, rk: RK): void
    storeRDK(txn: unknown, rdk: RDK): void
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
    senderKey: string
    sessionId: string
    sessionData?: InboundGroupSessionData
}

export interface IWithheld {
    room_id: string
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
