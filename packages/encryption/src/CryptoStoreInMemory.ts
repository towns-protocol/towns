import {
    AccountRecord,
    ExtendedInboundGroupSessionData,
    GroupSessionRecord,
    HybridGroupSessionRecord,
    UserDeviceRecord,
} from './storeTypes'
import { InboundGroupSessionData } from './encryptionDevice'
import { UserDevice } from './olmLib'
import { CryptoStore, DEFAULT_USER_DEVICE_EXPIRATION_TIME_MS } from './cryptoStore'

export class CryptoStoreInMemory implements CryptoStore {
    private accounts: Map<string, AccountRecord> = new Map()
    private outboundGroupSessions: Map<string, GroupSessionRecord> = new Map()
    private inboundGroupSessions: Map<string, ExtendedInboundGroupSessionData> = new Map()
    private hybridGroupSessions: Map<string, HybridGroupSessionRecord> = new Map()
    private devices: Map<string, UserDeviceRecord> = new Map()

    constructor(public readonly userId: string) {}

    async initialize(): Promise<void> {
        const now = Date.now()
        const expiredKeys: string[] = []
        for (const [key, device] of this.devices.entries()) {
            if (device.expirationTimestamp < now) {
                expiredKeys.push(key)
            }
        }
        expiredKeys.forEach((key) => this.devices.delete(key))
    }

    async deleteAllData(): Promise<void> {
        this.accounts.clear()
        this.outboundGroupSessions.clear()
        this.inboundGroupSessions.clear()
        this.hybridGroupSessions.clear()
        this.devices.clear()
    }

    async deleteInboundGroupSessions(streamId: string, sessionId: string): Promise<void> {
        const key = this.getInboundSessionKey(streamId, sessionId)
        this.inboundGroupSessions.delete(key)
    }

    async deleteAccount(userId: string): Promise<void> {
        this.accounts.delete(userId)
    }

    async getAccount(): Promise<string> {
        const account = this.accounts.get(this.userId)
        if (!account) {
            throw new Error('account not found')
        }
        return account.accountPickle
    }

    async storeAccount(accountPickle: string): Promise<void> {
        this.accounts.set(this.userId, { id: this.userId, accountPickle })
    }

    async storeEndToEndOutboundGroupSession(
        sessionId: string,
        sessionData: string,
        streamId: string,
    ): Promise<void> {
        this.outboundGroupSessions.set(streamId, { sessionId, session: sessionData, streamId })
    }

    async getEndToEndOutboundGroupSession(streamId: string): Promise<string> {
        const session = this.outboundGroupSessions.get(streamId)
        if (!session) {
            throw new Error('session not found')
        }
        return session.session
    }

    async getAllEndToEndOutboundGroupSessions(): Promise<GroupSessionRecord[]> {
        return Array.from(this.outboundGroupSessions.values())
    }

    async getEndToEndInboundGroupSession(
        streamId: string,
        sessionId: string,
    ): Promise<InboundGroupSessionData | undefined> {
        const key = this.getInboundSessionKey(streamId, sessionId)
        const session = this.inboundGroupSessions.get(key)
        if (session) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { streamId: _, sessionId: __, ...sessionData } = session
            return sessionData
        }
        return undefined
    }

    async getHybridGroupSession(
        streamId: string,
        sessionId: string,
    ): Promise<HybridGroupSessionRecord | undefined> {
        const key = this.getHybridSessionKey(streamId, sessionId)
        return this.hybridGroupSessions.get(key)
    }

    async getHybridGroupSessionsForStream(streamId: string): Promise<HybridGroupSessionRecord[]> {
        const sessions: HybridGroupSessionRecord[] = []
        for (const session of this.hybridGroupSessions.values()) {
            if (session.streamId === streamId) {
                sessions.push(session)
            }
        }
        return sessions
    }

    async getAllEndToEndInboundGroupSessions(): Promise<ExtendedInboundGroupSessionData[]> {
        return Array.from(this.inboundGroupSessions.values())
    }

    async getAllHybridGroupSessions(): Promise<HybridGroupSessionRecord[]> {
        return Array.from(this.hybridGroupSessions.values())
    }

    async storeEndToEndInboundGroupSession(
        streamId: string,
        sessionId: string,
        sessionData: InboundGroupSessionData,
    ): Promise<void> {
        const key = this.getInboundSessionKey(streamId, sessionId)
        this.inboundGroupSessions.set(key, { streamId, sessionId, ...sessionData })
    }

    async storeHybridGroupSession(sessionData: HybridGroupSessionRecord): Promise<void> {
        const key = this.getHybridSessionKey(sessionData.streamId, sessionData.sessionId)
        this.hybridGroupSessions.set(key, sessionData)
    }

    async getInboundGroupSessionIds(streamId: string): Promise<string[]> {
        const sessionIds: string[] = []
        for (const session of this.inboundGroupSessions.values()) {
            if (session.streamId === streamId) {
                sessionIds.push(session.sessionId)
            }
        }
        return sessionIds
    }

    async getHybridGroupSessionIds(streamId: string): Promise<string[]> {
        const sessionIds: string[] = []
        for (const session of this.hybridGroupSessions.values()) {
            if (session.streamId === streamId) {
                sessionIds.push(session.sessionId)
            }
        }
        return sessionIds
    }

    async withAccountTx<T>(fn: () => Promise<T>): Promise<T> {
        // In-memory implementation doesn't need transactions
        return await fn()
    }

    async withGroupSessions<T>(fn: () => Promise<T>): Promise<T> {
        // In-memory implementation doesn't need transactions
        return await fn()
    }

    async deviceRecordCount(): Promise<number> {
        return this.devices.size
    }

    async saveUserDevices(
        userId: string,
        devices: UserDevice[],
        expirationMs: number = DEFAULT_USER_DEVICE_EXPIRATION_TIME_MS,
    ): Promise<void> {
        const expirationTimestamp = Date.now() + expirationMs
        for (const device of devices) {
            const key = this.getDeviceKey(userId, device.deviceKey)
            this.devices.set(key, { userId, expirationTimestamp, ...device })
        }
    }

    async getUserDevices(userId: string): Promise<UserDevice[]> {
        const now = Date.now()
        const userDevices: UserDevice[] = []
        for (const device of this.devices.values()) {
            if (device.userId === userId && device.expirationTimestamp > now) {
                userDevices.push({
                    deviceKey: device.deviceKey,
                    fallbackKey: device.fallbackKey,
                })
            }
        }
        return userDevices
    }

    private getInboundSessionKey(streamId: string, sessionId: string): string {
        return `${streamId}:${sessionId}`
    }

    private getHybridSessionKey(streamId: string, sessionId: string): string {
        return `${streamId}:${sessionId}`
    }

    private getDeviceKey(userId: string, deviceKey: string): string {
        return `${userId}:${deviceKey}`
    }
}
