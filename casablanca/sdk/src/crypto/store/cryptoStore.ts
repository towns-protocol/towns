import { UserDevice } from '../olmLib'
import { InboundGroupSessionData } from '../olmDevice'
import {
    ISessionInfo,
    AccountRecord,
    MegolmSessionRecord,
    OlmSessionRecord,
    UserDeviceRecord,
} from './types'

import Dexie, { Table } from 'dexie'

const DEFAULT_USER_DEVICE_EXPIRATION_TIME_MS = 15 * 60 * 1000 // 15 minutes

export class CryptoStore extends Dexie {
    account!: Table<AccountRecord>
    olmSessions!: Table<OlmSessionRecord>
    outboundGroupSessions!: Table<MegolmSessionRecord>
    inboundGroupSessions!: Table<InboundGroupSessionData & { streamId: string; sessionId: string }>
    devices!: Table<UserDeviceRecord>
    userId: string

    constructor(databaseName: string, userId: string) {
        super(databaseName)
        this.userId = userId
        this.version(4).stores({
            account: 'id',
            olmSessions: '[deviceKey+sessionId], deviceKey, sessionId',
            inboundGroupSessions: '[streamId+sessionId]',
            outboundGroupSessions: 'streamId',
            devices: '[userId+deviceId],expirationTimestamp',
        })
    }

    async initialize() {
        await this.devices.where('expirationTimestamp').below(Date.now()).delete()
    }

    deleteAllData() {
        throw new Error('Method not implemented.')
    }

    async deleteInboundGroupSessions(streamId: string, sessionId: string): Promise<void> {
        await this.inboundGroupSessions.where({ streamId, sessionId }).delete()
    }

    async deleteAccount(userId: string): Promise<void> {
        await this.account.where({ id: userId }).delete()
    }

    async getAccount(): Promise<string> {
        const account = await this.account.get({ id: this.userId })
        if (!account) {
            throw new Error('account not found')
        }
        return account.accountPickle
    }

    async storeAccount(accountPickle: string): Promise<void> {
        await this.account.put({ id: this.userId, accountPickle })
    }

    async getEndToEndSession(deviceKey: string, sessionId: string): Promise<ISessionInfo> {
        const session = await this.olmSessions.get({ deviceKey, sessionId })
        if (!session) {
            throw new Error('session not found')
        }
        return session
    }

    async getEndToEndSessions(deviceKey: string): Promise<ISessionInfo[]> {
        return await this.olmSessions.where({ deviceKey }).toArray()
    }

    async getAllEndToEndSessions(): Promise<ISessionInfo[]> {
        return await this.olmSessions.toArray()
    }

    async storeEndToEndSession(sessionInfo: ISessionInfo): Promise<void> {
        await this.olmSessions.put(sessionInfo)
    }

    async storeEndToEndOutboundGroupSession(
        sessionId: string,
        sessionData: string,
        streamId: string,
    ): Promise<void> {
        await this.outboundGroupSessions.put({ sessionId, session: sessionData, streamId })
    }

    async getEndToEndOutboundGroupSession(streamId: string): Promise<string> {
        const session = await this.outboundGroupSessions.get({ streamId })
        if (!session) {
            throw new Error('session not found')
        }
        return session.session
    }

    async getEndToEndInboundGroupSession(
        streamId: string,
        sessionId: string,
    ): Promise<InboundGroupSessionData | undefined> {
        return await this.inboundGroupSessions.get({ sessionId, streamId })
    }

    async storeEndToEndInboundGroupSession(
        streamId: string,
        sessionId: string,
        sessionData: InboundGroupSessionData,
    ): Promise<void> {
        await this.inboundGroupSessions.put({ streamId, sessionId, ...sessionData })
    }

    async getInboundGroupSessionIds(streamId: string): Promise<string[]> {
        const sessions = await this.inboundGroupSessions.where({ streamId }).toArray()
        return sessions.map((s) => s.sessionId)
    }

    async withOlmSessionsTx<T>(fn: () => Promise<T>): Promise<T> {
        return await this.transaction('rw', this.olmSessions, fn)
    }

    async withAccountAndOlmSessionsTx<T>(fn: () => Promise<T>): Promise<T> {
        return await this.transaction('rw', this.account, this.olmSessions, fn)
    }

    async withMegolmSessions<T>(fn: () => Promise<T>): Promise<T> {
        return await this.transaction(
            'rw',
            this.outboundGroupSessions,
            this.inboundGroupSessions,
            fn,
        )
    }

    /**
     * Only used for testing
     * @returns total number of devices in the store
     */
    async deviceRecordCount() {
        return await this.devices.count()
    }

    /**
     * Store a list of devices for a given userId
     * @param userId string
     * @param devices UserDeviceInfo[]
     * @param expirationMs Expiration time in milliseconds
     */
    async saveUserDevices(
        userId: string,
        devices: UserDevice[],
        expirationMs: number = DEFAULT_USER_DEVICE_EXPIRATION_TIME_MS,
    ) {
        const expirationTimestamp = Date.now() + expirationMs
        for (const device of devices) {
            await this.devices.put({ userId, expirationTimestamp, ...device })
        }
    }

    /**
     * Get all stored devices for a given userId
     * @param userId string
     * @returns UserDevice[], a list of devices
     */
    async getUserDevices(userId: string): Promise<UserDevice[]> {
        const expirationTimestamp = Date.now()
        return (
            await this.devices
                .where('userId')
                .equals(userId)
                .and((record) => record.expirationTimestamp > expirationTimestamp)
                .toArray()
        ).map((record) => ({
            deviceId: record.deviceId,
            deviceKey: record.deviceKey,
            fallbackKey: record.fallbackKey,
        }))
    }
}
