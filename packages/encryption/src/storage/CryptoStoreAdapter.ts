/**
 * CryptoStore implementation that uses a StorageAdapter.
 * This allows users to bring their own database (Drizzle, etc.) for encryption storage.
 */

import type { StorageAdapter } from '@towns-protocol/storage'
import { typedAdapter, type TypedStorageAdapter } from '@towns-protocol/storage'
import type { CryptoStore } from '../cryptoStore.js'
import type { InboundGroupSessionData } from '../encryptionDevice.js'
import type { UserDevice } from '../olmLib.js'
import type {
    ExtendedInboundGroupSessionData,
    GroupSessionRecord,
    HybridGroupSessionRecord,
} from '../storeTypes.js'
import { DEFAULT_USER_DEVICE_EXPIRATION_TIME_MS } from '../cryptoStore.js'
import { cryptoSchema } from './cryptoSchema.js'

/**
 * CryptoStore implementation that uses a StorageAdapter.
 * Allows using any database backend (Drizzle, PostgreSQL, etc.) for encryption storage.
 */
export class CryptoStoreAdapter implements CryptoStore {
    private readonly adapter: TypedStorageAdapter<typeof cryptoSchema>

    constructor(
        public readonly userId: string,
        adapter: StorageAdapter,
    ) {
        this.adapter = typedAdapter(adapter, cryptoSchema)
    }

    async initialize(): Promise<void> {
        // Delete expired devices using deleteMany
        const now = Date.now()
        await this.adapter.deleteMany({
            model: 'devices',
            where: [{ field: 'expirationTimestamp', operator: 'lt', value: now }],
        })
    }

    async deleteAllData(): Promise<void> {
        // Delete all records from each table using clear()
        await this.adapter.clear({ model: 'account' })
        await this.adapter.clear({ model: 'outboundGroupSessions' })
        await this.adapter.clear({ model: 'inboundGroupSessions' })
        await this.adapter.clear({ model: 'hybridGroupSessions' })
        await this.adapter.clear({ model: 'devices' })
    }

    async deleteInboundGroupSessions(streamId: string, sessionId: string): Promise<void> {
        await this.adapter.delete({
            model: 'inboundGroupSessions',
            where: [
                { field: 'streamId', value: streamId },
                { field: 'sessionId', value: sessionId },
            ],
        })
    }

    async deleteOutboundGrounpSessions(streamId: string): Promise<void> {
        await this.adapter.delete({
            model: 'outboundGroupSessions',
            where: [{ field: 'streamId', value: streamId }],
        })
    }

    async deleteAccount(userId: string): Promise<void> {
        await this.adapter.delete({
            model: 'account',
            where: [{ field: 'id', value: userId }],
        })
    }

    async getAccount(): Promise<string> {
        const account = await this.adapter.findOne({
            model: 'account',
            where: [{ field: 'id', value: this.userId }],
        })
        if (!account) {
            throw new Error('account not found')
        }
        return account.accountPickle
    }

    async storeAccount(accountPickle: string): Promise<void> {
        await this.adapter.upsert({
            model: 'account',
            where: [{ field: 'id', value: this.userId }],
            create: { id: this.userId, accountPickle },
            update: { accountPickle },
        })
    }

    async storeEndToEndOutboundGroupSession(
        sessionId: string,
        sessionData: string,
        streamId: string,
    ): Promise<void> {
        await this.adapter.upsert({
            model: 'outboundGroupSessions',
            where: [{ field: 'streamId', value: streamId }],
            create: { streamId, sessionId, session: sessionData },
            update: { sessionId, session: sessionData },
        })
    }

    async getEndToEndOutboundGroupSession(streamId: string): Promise<string> {
        const session = await this.adapter.findOne({
            model: 'outboundGroupSessions',
            where: [{ field: 'streamId', value: streamId }],
        })
        if (!session) {
            throw new Error('session not found')
        }
        return session.session
    }

    async getAllEndToEndOutboundGroupSessions(): Promise<GroupSessionRecord[]> {
        return this.adapter.findMany({
            model: 'outboundGroupSessions',
        })
    }

    async getEndToEndInboundGroupSession(
        streamId: string,
        sessionId: string,
    ): Promise<InboundGroupSessionData | undefined> {
        const session = await this.adapter.findOne({
            model: 'inboundGroupSessions',
            where: [
                { field: 'streamId', value: streamId },
                { field: 'sessionId', value: sessionId },
            ],
        })
        if (!session) {
            return undefined
        }
        // Return only InboundGroupSessionData fields
        return {
            stream_id: session.stream_id,
            session: session.session,
            keysClaimed: session.keysClaimed,
            untrusted: session.untrusted ?? undefined,
        }
    }

    async getHybridGroupSession(
        streamId: string,
        sessionId: string,
    ): Promise<HybridGroupSessionRecord | undefined> {
        const session = await this.adapter.findOne({
            model: 'hybridGroupSessions',
            where: [
                { field: 'streamId', value: streamId },
                { field: 'sessionId', value: sessionId },
            ],
        })
        return session ?? undefined
    }

    async getHybridGroupSessionsForStream(streamId: string): Promise<HybridGroupSessionRecord[]> {
        return this.adapter.findMany({
            model: 'hybridGroupSessions',
            where: [{ field: 'streamId', value: streamId }],
        })
    }

    async getAllEndToEndInboundGroupSessions(): Promise<ExtendedInboundGroupSessionData[]> {
        const sessions = await this.adapter.findMany({
            model: 'inboundGroupSessions',
        })
        // Cast to ExtendedInboundGroupSessionData which includes streamId and sessionId
        return sessions as unknown as ExtendedInboundGroupSessionData[]
    }

    async getAllHybridGroupSessions(): Promise<HybridGroupSessionRecord[]> {
        return this.adapter.findMany({
            model: 'hybridGroupSessions',
        })
    }

    async deleteHybridGroupSessions(streamId: string): Promise<void> {
        await this.adapter.deleteMany({
            model: 'hybridGroupSessions',
            where: [{ field: 'streamId', value: streamId }],
        })
    }

    async storeEndToEndInboundGroupSession(
        streamId: string,
        sessionId: string,
        sessionData: InboundGroupSessionData,
    ): Promise<void> {
        await this.adapter.upsert({
            model: 'inboundGroupSessions',
            where: [
                { field: 'streamId', value: streamId },
                { field: 'sessionId', value: sessionId },
            ],
            create: { streamId, sessionId, ...sessionData },
            update: sessionData,
        })
    }

    async storeHybridGroupSession(sessionData: HybridGroupSessionRecord): Promise<void> {
        await this.adapter.upsert({
            model: 'hybridGroupSessions',
            where: [
                { field: 'streamId', value: sessionData.streamId },
                { field: 'sessionId', value: sessionData.sessionId },
            ],
            create: sessionData,
            update: sessionData,
        })
    }

    async getInboundGroupSessionIds(streamId: string): Promise<string[]> {
        const sessions = await this.adapter.findMany({
            model: 'inboundGroupSessions',
            where: [{ field: 'streamId', value: streamId }],
        })
        return sessions.map((s) => s.sessionId)
    }

    async getHybridGroupSessionIds(streamId: string): Promise<string[]> {
        const sessions = await this.adapter.findMany({
            model: 'hybridGroupSessions',
            where: [{ field: 'streamId', value: streamId }],
        })
        return sessions.map((s) => s.sessionId)
    }

    async withAccountTx<T>(fn: () => Promise<T>): Promise<T> {
        return this.adapter.transaction(async () => fn())
    }

    async withGroupSessions<T>(fn: () => Promise<T>): Promise<T> {
        return this.adapter.transaction(async () => fn())
    }

    async deviceRecordCount(): Promise<number> {
        return this.adapter.count({ model: 'devices' })
    }

    async saveUserDevices(
        userId: string,
        devices: UserDevice[],
        expirationMs: number = DEFAULT_USER_DEVICE_EXPIRATION_TIME_MS,
    ): Promise<void> {
        const expirationTimestamp = Date.now() + expirationMs

        for (const device of devices) {
            await this.adapter.upsert({
                model: 'devices',
                where: [
                    { field: 'userId', value: userId },
                    { field: 'deviceKey', value: device.deviceKey },
                ],
                create: {
                    userId,
                    deviceKey: device.deviceKey,
                    fallbackKey: device.fallbackKey,
                    expirationTimestamp,
                },
                update: { fallbackKey: device.fallbackKey, expirationTimestamp },
            })
        }
    }

    async getUserDevices(userId: string): Promise<UserDevice[]> {
        const now = Date.now()
        const devices = await this.adapter.findMany({
            model: 'devices',
            where: [
                { field: 'userId', value: userId },
                { field: 'expirationTimestamp', operator: 'gt', value: now },
            ],
        })

        return devices.map((record) => ({
            deviceKey: record.deviceKey,
            fallbackKey: record.fallbackKey,
        }))
    }
}
