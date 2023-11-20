import { IOlmDevice } from '../deviceList'
import { InboundGroupSessionData } from '../olmDevice'
import {
    IDeviceData,
    IWithheld,
    ISessionInfo,
    AccountRecord,
    MegolmSessionRecord,
    OlmSessionRecord,
} from './types'

import Dexie, { Table } from 'dexie'

export class CryptoStore extends Dexie {
    account!: Table<AccountRecord>
    olmSessions!: Table<OlmSessionRecord>
    outboundGroupSessions!: Table<MegolmSessionRecord>
    inboundGroupSessions!: Table<InboundGroupSessionData & { streamId: string; sessionId: string }>
    inboundGroupSessionsWithheld!: Table<IWithheld & { streamId: string; sessionId: string }>
    sharedHistoryInboundSessions!: Table<{ streamId: string; sessionId: string }>
    deviceData!: Table<IDeviceData>
    notifiedErrorDevices!: Table<IOlmDevice>
    userId: string

    constructor(databaseName: string, userId: string) {
        super(databaseName)
        this.userId = userId
        this.version(1).stores({
            account: 'id',
            olmSessions: '[deviceKey+sessionId], deviceKey, sessionId',
            inboundGroupSessions: '[streamId+sessionId]',
            inboundGroupSessionsWithheld: '[streamId+sessionId]',
            outboundGroupSessions: 'streamId',
            sharedHistoryInboundSessions: '[streamId+sessionId]',
            deviceData: '',
            notifiedErrorDevices: '',
        })
    }

    deleteAllData() {
        throw new Error('Method not implemented.')
    }

    async deleteInboundGroupSessions(streamId: string, sessionId: string): Promise<void> {
        await this.inboundGroupSessions.where({ streamId, sessionId }).delete()
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

    async getEndToEndInboundGroupSessionWithheld(
        streamId: string,
        sessionId: string,
    ): Promise<IWithheld | undefined> {
        return await this.inboundGroupSessionsWithheld.get({ sessionId, streamId })
    }

    async storeEndToEndInboundGroupSession(
        streamId: string,
        sessionId: string,
        sessionData: InboundGroupSessionData,
    ): Promise<void> {
        await this.inboundGroupSessions.put({ streamId, sessionId, ...sessionData })
    }

    async storeEndToEndInboundGroupSessionWithheld(
        streamId: string,
        sessionId: string,
        sessionData: IWithheld,
    ): Promise<void> {
        await this.inboundGroupSessionsWithheld.put({ streamId, sessionId, ...sessionData })
    }

    // Device Data
    async getEndToEndDeviceData(): Promise<IDeviceData | undefined> {
        return await this.deviceData.get('-')
    }

    async storeEndToEndDeviceData(deviceData: IDeviceData): Promise<void> {
        await this.deviceData.put(deviceData, '-')
    }

    async addSharedHistoryInboundGroupSession(streamId: string, sessionId: string): Promise<void> {
        await this.sharedHistoryInboundSessions.put({ streamId, sessionId })
    }

    async getSharedHistoryInboundGroupSessions(
        streamId: string,
    ): Promise<[streamId: string, sessionId: string][]> {
        const sessions = await this.sharedHistoryInboundSessions.where({ streamId }).toArray()
        return sessions.map((s) => [s.streamId, s.sessionId])
    }

    async withOlmSessionsTx<T>(fn: () => Promise<T>): Promise<T> {
        return await this.transaction('rw', this.olmSessions, async () => {
            return await fn()
        })
    }

    async withAccountAndOlmSessionsTx<T>(fn: () => Promise<T>): Promise<T> {
        return await this.transaction('rw', this.account, this.olmSessions, async () => {
            return await fn()
        })
    }

    async withOutboundGroupSessionsTx<T>(fn: () => Promise<T>): Promise<T> {
        return await this.transaction('rw', this.outboundGroupSessions, async () => {
            return await fn()
        })
    }
}
