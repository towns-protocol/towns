import {
    CryptoStore,
    IDeviceData,
    IProblem,
    ISession,
    ISessionInfo,
    IWithheld,
    Mode,
    OutgoingRoomKeyRequest,
    IRoomEncryption,
} from './base'
import { IRoomKeyRequestBody, RoomKeyRequestState } from '../crypto'
import { IOlmDevice } from '../deviceList'
import { InboundGroupSessionData } from '../olmDevice'
import { safeSet, promiseTry } from '../../utils'
import isEqual from 'lodash/isEqual'
import { dlog } from '../../dlog'

const log = dlog('csb:crypto:memory')

/**
 * Internal module. in-memory storage for e2e.
 * Note: cross-signing, secure secret storage not yet implemented.
 */
// todo: fix lint issues and remove exception see: https://linear.app/hnt-labs/issue/HNT-1721/address-linter-overrides-in-matrix-encryption-code-from-sdk
/* eslint-disable @typescript-eslint/no-unused-vars */

export class MemoryCryptoStore implements CryptoStore {
    private outgoingRoomKeyRequests: OutgoingRoomKeyRequest[] = []
    private account: string | null = null

    private sessions: { [deviceKey: string]: { [sessionId: string]: ISessionInfo } } = {}
    private sessionProblems: { [deviceKey: string]: IProblem[] } = {}
    private notifiedErrorDevices: { [userId: string]: { [deviceId: string]: boolean } } = {}
    private inboundGroupSessions: { [sessionKey: string]: InboundGroupSessionData } = {}
    private inboundGroupSessionsWithheld: Record<string, IWithheld> = {}
    // Opaque device data object
    private deviceData: IDeviceData | null = null
    private rooms: { [streamId: string]: IRoomEncryption } = {}
    private sessionsNeedingBackup: { [sessionKey: string]: boolean } = {}
    private sharedHistoryInboundGroupSessions: {
        [streamId: string]: [senderKey: string, sessionId: string][]
    } = {}

    /**
     * Ensure the database exists and is up-to-date.
     *
     * This must be called before the store can be used.
     *
     */
    public async startup(): Promise<CryptoStore> {
        // No startup work to do for the memory store.
        return this
    }

    /**
     * Delete all data from this store.
     *
     */
    public deleteAllData(): Promise<void> {
        return Promise.resolve()
    }

    public deleteInboundGroupSessions(_streamId: string, _sessionId: string): Promise<void> {
        return Promise.resolve()
    }

    /**
     * Look for an existing outgoing room key request, and if none is found,
     * add a new one
     *
     *
     */
    public getOrAddOutgoingRoomKeyRequest(
        request: OutgoingRoomKeyRequest,
    ): Promise<OutgoingRoomKeyRequest> {
        const requestBody = request.requestBody

        return promiseTry(() => {
            // first see if we already have an entry for this request.
            const existing = this._getOutgoingRoomKeyRequest(requestBody)

            if (existing) {
                // this entry matches the request - return it.
                log(
                    `already have key request outstanding for ` +
                        `${requestBody.channel_id} / ${requestBody.session_id}: ` +
                        `not sending another`,
                )
                return existing
            }

            // we got to the end of the list without finding a match
            // - add the new request.
            log(`enqueueing key request for ${requestBody.channel_id} / ` + requestBody.session_id)
            this.outgoingRoomKeyRequests.push(request)
            return request
        })
    }

    /**
     * Look for an existing room key request
     *
     */
    public getOutgoingRoomKeyRequest(
        requestBody: IRoomKeyRequestBody,
    ): Promise<OutgoingRoomKeyRequest | null> {
        return Promise.resolve(this._getOutgoingRoomKeyRequest(requestBody))
    }

    /**
     * Looks for existing room key request, and returns the result synchronously.
     *
     */
    // eslint-disable-next-line @typescript-eslint/naming-convention
    private _getOutgoingRoomKeyRequest(
        requestBody: IRoomKeyRequestBody,
    ): OutgoingRoomKeyRequest | null {
        for (const existing of this.outgoingRoomKeyRequests) {
            if (isEqual(existing.requestBody, requestBody)) {
                return existing
            }
        }
        return null
    }

    /**
     * Look for room key requests by state
     *
     * @param wantedStates - list of acceptable states
     *
     * @returns resolves to the a
     *    {@link OutgoingRoomKeyRequest}, or null if
     *    there are no pending requests in those states
     */
    public getOutgoingRoomKeyRequestByState(
        wantedStates: RoomKeyRequestState[],
    ): Promise<OutgoingRoomKeyRequest | null> {
        for (const req of this.outgoingRoomKeyRequests) {
            for (const state of wantedStates) {
                if (req.state === state) {
                    return Promise.resolve(req)
                }
            }
        }
        return Promise.resolve(null)
    }

    /**
     *
     * @returns All OutgoingRoomKeyRequests in state
     */
    public getAllOutgoingRoomKeyRequestsByState(
        wantedState: RoomKeyRequestState,
    ): Promise<OutgoingRoomKeyRequest[]> {
        return Promise.resolve(this.outgoingRoomKeyRequests.filter((r) => r.state == wantedState))
    }

    public getOutgoingRoomKeyRequestsByTarget(
        userId: string,
        deviceId: string,
        wantedStates: RoomKeyRequestState[],
    ): Promise<OutgoingRoomKeyRequest[]> {
        const results: OutgoingRoomKeyRequest[] = []

        for (const req of this.outgoingRoomKeyRequests) {
            for (const state of wantedStates) {
                if (
                    req.state === state &&
                    req.recipients.some(
                        (recipient) =>
                            recipient.userId === userId && recipient.deviceId === deviceId,
                    )
                ) {
                    results.push(req)
                }
            }
        }
        return Promise.resolve(results)
    }

    /**
     * Look for an existing room key request by id and state, and update it if
     * found
     *
     */
    public updateOutgoingRoomKeyRequest(
        requestId: string,
        expectedState: RoomKeyRequestState,
        updates: Partial<OutgoingRoomKeyRequest>,
    ): Promise<OutgoingRoomKeyRequest | null> {
        for (const req of this.outgoingRoomKeyRequests) {
            if (req.requestId !== requestId) {
                continue
            }

            if (req.state !== expectedState) {
                log(
                    `Cannot update room key request from ${expectedState} ` +
                        `as it was already updated to ${req.state}`,
                )
                return Promise.resolve(null)
            }
            Object.assign(req, updates)
            return Promise.resolve(req)
        }

        return Promise.resolve(null)
    }

    /**
     * Look for an existing room key request by id and state, and delete it if
     * found
     *
     */
    public deleteOutgoingRoomKeyRequest(
        requestId: string,
        expectedState: RoomKeyRequestState,
    ): Promise<OutgoingRoomKeyRequest | null> {
        for (let i = 0; i < this.outgoingRoomKeyRequests.length; i++) {
            const req = this.outgoingRoomKeyRequests[i]

            if (req.requestId !== requestId) {
                continue
            }

            if (req.state != expectedState) {
                log(
                    `Cannot delete room key request in state ${req.state} ` +
                        `(expected ${expectedState})`,
                )
                return Promise.resolve(null)
            }

            this.outgoingRoomKeyRequests.splice(i, 1)
            return Promise.resolve(req)
        }

        return Promise.resolve(null)
    }

    // Olm Account

    public getAccount(txn: null, func: (accountPickle: string | null) => void): void {
        func(this.account)
    }

    public storeAccount(txn: null, accountPickle: string): void {
        this.account = accountPickle
    }

    // Olm Sessions

    public countEndToEndSessions(txn: null, func: (count: number) => void): void {
        func(Object.keys(this.sessions).length)
    }

    public getEndToEndSession(
        deviceKey: string,
        sessionId: string,
        txn: null,
        func: (session: ISessionInfo) => void,
    ): void {
        const deviceSessions = this.sessions[deviceKey] || {}
        func(deviceSessions[sessionId] || null)
    }

    public getEndToEndSessions(
        deviceKey: string,
        txn: null,
        func: (sessions: { [sessionId: string]: ISessionInfo }) => void,
    ): void {
        func(this.sessions[deviceKey] || {})
    }

    public getAllEndToEndSessions(txn: null, func: (session: ISessionInfo) => void): void {
        Object.entries(this.sessions).forEach(([deviceKey, deviceSessions]) => {
            Object.entries(deviceSessions).forEach(([sessionId, session]) => {
                func({
                    ...session,
                    deviceKey,
                    sessionId,
                })
            })
        })
    }

    public storeEndToEndSession(
        deviceKey: string,
        sessionId: string,
        sessionInfo: ISessionInfo,
        txn: null,
    ): void {
        let deviceSessions = this.sessions[deviceKey]
        if (deviceSessions === undefined) {
            deviceSessions = {}
            this.sessions[deviceKey] = deviceSessions
        }
        safeSet(deviceSessions, sessionId, sessionInfo)
    }

    public async storeEndToEndSessionProblem(
        deviceKey: string,
        type: string,
        fixed: boolean,
    ): Promise<void> {
        const problems = (this.sessionProblems[deviceKey] = this.sessionProblems[deviceKey] || [])
        problems.push({ type, fixed, time: Date.now() })
        problems.sort((a, b) => {
            return a.time - b.time
        })
    }

    public async getEndToEndSessionProblem(
        deviceKey: string,
        timestamp: number,
    ): Promise<IProblem | null> {
        const problems = this.sessionProblems[deviceKey] || []
        if (!problems.length) {
            return null
        }
        const lastProblem = problems[problems.length - 1]
        for (const problem of problems) {
            if (problem.time > timestamp) {
                return Object.assign({}, problem, { fixed: lastProblem.fixed })
            }
        }
        if (lastProblem.fixed) {
            return null
        } else {
            return lastProblem
        }
    }

    public async filterOutNotifiedErrorDevices(devices: IOlmDevice[]): Promise<IOlmDevice[]> {
        const notifiedErrorDevices = this.notifiedErrorDevices
        const ret: IOlmDevice[] = []

        for (const device of devices) {
            const { userId, deviceInfo } = device
            if (userId in notifiedErrorDevices) {
                if (!(deviceInfo.deviceId in notifiedErrorDevices[userId])) {
                    ret.push(device)
                    safeSet(notifiedErrorDevices[userId], deviceInfo.deviceId, true)
                }
            } else {
                ret.push(device)
                safeSet(notifiedErrorDevices, userId, { [deviceInfo.deviceId]: true })
            }
        }

        return ret
    }

    // Inbound Group Sessions

    public getEndToEndInboundGroupSession(
        streamId: string,
        sessionId: string,
        txn: null,
        func: (
            groupSession: InboundGroupSessionData | null,
            groupSessionWithheld: IWithheld | null,
        ) => void,
    ): void {
        const k = streamId + '/' + sessionId
        func(this.inboundGroupSessions[k] || null, this.inboundGroupSessionsWithheld[k] || null)
    }

    public getAllEndToEndInboundGroupSessions(
        txn: null,
        func: (session: ISession | null) => void,
    ): void {
        for (const key of Object.keys(this.inboundGroupSessions)) {
            // we can't use split, as the components we are trying to split out
            // might themselves contain '/' characters. We rely on the
            // senderKey being a (32-byte) curve25519 key, base64-encoded
            // (hence 43 characters long).

            func({
                streamId: key.slice(0, 43),
                sessionId: key.slice(44),
                sessionData: this.inboundGroupSessions[key],
            })
        }
        func(null)
    }

    public addEndToEndInboundGroupSession(
        streamId: string,
        sessionId: string,
        sessionData: InboundGroupSessionData,
        txn: null,
    ): void {
        const k = streamId + '/' + sessionId
        if (this.inboundGroupSessions[k] === undefined) {
            this.inboundGroupSessions[k] = sessionData
        }
    }

    public storeEndToEndInboundGroupSession(
        streamId: string,
        sessionId: string,
        sessionData: InboundGroupSessionData,
        txn: null,
    ): void {
        this.inboundGroupSessions[streamId + '/' + sessionId] = sessionData
    }

    public storeEndToEndInboundGroupSessionWithheld(
        streamId: string,
        sessionId: string,
        sessionData: IWithheld,
        txn: null,
    ): void {
        const k = streamId + '/' + sessionId
        this.inboundGroupSessionsWithheld[k] = sessionData
    }

    // Device Data

    public getEndToEndDeviceData(txn: null, func: (deviceData: IDeviceData | null) => void): void {
        func(this.deviceData)
    }

    public storeEndToEndDeviceData(deviceData: IDeviceData, txn: null): void {
        this.deviceData = deviceData
    }

    // E2E rooms

    public storeEndToEndRoom(streamId: string, roomInfo: IRoomEncryption, txn: null): void {
        this.rooms[streamId] = roomInfo
    }

    public getEndToEndRooms(
        txn: null,
        func: (rooms: Record<string, IRoomEncryption>) => void,
    ): void {
        func(this.rooms)
    }

    public getSessionsNeedingBackup(limit: number): Promise<ISession[]> {
        const sessions: ISession[] = []
        for (const session in this.sessionsNeedingBackup) {
            if (this.inboundGroupSessions[session]) {
                sessions.push({
                    streamId: session.slice(0, 43),
                    sessionId: session.slice(44),
                    sessionData: this.inboundGroupSessions[session],
                })
                if (limit && session.length >= limit) {
                    break
                }
            }
        }
        return Promise.resolve(sessions)
    }

    public countSessionsNeedingBackup(): Promise<number> {
        return Promise.resolve(Object.keys(this.sessionsNeedingBackup).length)
    }

    public unmarkSessionsNeedingBackup(sessions: ISession[]): Promise<void> {
        for (const session of sessions) {
            const sessionKey = session.streamId + '/' + session.sessionId
            delete this.sessionsNeedingBackup[sessionKey]
        }
        return Promise.resolve()
    }

    public markSessionsNeedingBackup(sessions: ISession[]): Promise<void> {
        for (const session of sessions) {
            const sessionKey = session.streamId + '/' + session.sessionId
            this.sessionsNeedingBackup[sessionKey] = true
        }
        return Promise.resolve()
    }

    public addSharedHistoryInboundGroupSession(streamId: string, sessionId: string): void {
        const sessions = this.sharedHistoryInboundGroupSessions[streamId] || []
        sessions.push([streamId, sessionId])
        this.sharedHistoryInboundGroupSessions[streamId] = sessions
    }

    public getSharedHistoryInboundGroupSessions(
        streamId: string,
    ): Promise<[streamId: string, sessionId: string][]> {
        return Promise.resolve(this.sharedHistoryInboundGroupSessions[streamId] || [])
    }

    // Session key backups

    public doTxn<T>(
        mode: Mode,
        stores: Iterable<string>,
        func: (txn: null) => T | Promise<T>,
    ): Promise<T> {
        return Promise.resolve(func(null))
    }
}
