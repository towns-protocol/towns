import './../../utils/envs.mock'

import { SyncCookie, SyncOp } from '@river-build/proto'
import { SyncState, SyncedStreams } from './syncedStreams'

import { StreamRpcClient } from './streamRpcClient'
import { SyncedStream } from '@prisma/client'
import crypto from 'crypto'
import { database } from '../../prisma'
import { protoInt64 } from '@bufbuild/protobuf'
import { streamIdToBytes } from './utils'

jest.mock('../web-push/send-notification', () => ({
    sendNotificationViaWebPush: jest.fn(),
}))

jest.mock('../../prisma', () => ({
    database: {
        syncedStream: {
            findMany: jest.fn(),
        },
    },
}))

// Helper function to generate a random Uint8Array
function generateRandomBytes(length: number): Uint8Array {
    return new Uint8Array(crypto.randomBytes(length))
}

function generateFakeSyncCookie(): SyncCookie {
    return new SyncCookie({
        nodeAddress: generateRandomBytes(20),
        streamId: generateRandomBytes(20),
        minipoolGen: protoInt64.zero,
        minipoolSlot: protoInt64.zero,
        prevMiniblockHash: generateRandomBytes(32),
    })
}

function newPromiseToWaitForSyncedStreamsState(
    syncedStreams: SyncedStreams,
    expectedState: SyncState,
): Promise<void> {
    return new Promise((resolve) => {
        const subscription = setInterval(() => {
            if (syncedStreams.syncState === expectedState) {
                clearInterval(subscription)
                resolve()
            }
        }, 100)
    })
}

// Define a mock async iterator function
function* mockAsyncGenerator(data: unknown[]) {
    for (const item of data) {
        yield item
    }
}

// Define a mock function for the db query
function mockDbSyncedStreamFindMany(fakeSynedStreamData: SyncedStream[]) {
    const mockDbFindMany = database.syncedStream.findMany as jest.Mock
    mockDbFindMany.mockResolvedValueOnce(fakeSynedStreamData)
    return database.syncedStream.findMany as jest.Mock
}

function mockRpcStreamData(mockStreamData: unknown[], syncedStreams: jest.Mock) {
    syncedStreams.mockImplementation(() => {
        return {
            [Symbol.asyncIterator]: jest.fn(() => mockAsyncGenerator(mockStreamData)),
        }
    })
    return syncedStreams
}

describe('SyncedStreams', () => {
    let syncedStreams: SyncedStreams
    let mockRpcClient: StreamRpcClient

    beforeEach(() => {
        mockRpcClient = {
            cancelSync: jest.fn(),
            addStreamToSync: jest.fn(),
            removeStreamFromSync: jest.fn(),
            syncStreams: jest.fn(),
            pingSync: jest.fn(),
        } as unknown as StreamRpcClient

        syncedStreams = new SyncedStreams(mockRpcClient)
    })

    it('should transition to syncing state', async () => {
        const syncId = 'syncId_123'
        // simualate db streams
        const dbStreams: SyncedStream[] = [
            {
                StreamId: 'streamId',
                UserIds: [],
                Kind: 'Channel',
                SyncCookie: generateFakeSyncCookie().toJsonString(),
            },
        ]
        mockDbSyncedStreamFindMany(dbStreams)
        // simulate the rpc response
        const mockStreamData = [
            {
                syncId,
                syncOp: SyncOp.SYNC_NEW,
            },
        ]
        mockRpcStreamData(mockStreamData, mockRpcClient.syncStreams as jest.Mock)
        // simulate an asynchronous operation that changes syncState to Syncing
        const syncingPromise = newPromiseToWaitForSyncedStreamsState(
            syncedStreams,
            SyncState.Syncing,
        )

        // start syncing streams
        syncedStreams.startSyncStreams()

        // await the promise to ensure it resolves successfully
        await expect(syncingPromise).resolves.toBeUndefined()
        expect(syncedStreams.syncId).toEqual(syncId)
        await expect(syncedStreams.stopSync()).resolves.toBeUndefined()
    })

    it('should add stream to sync', async () => {
        // simualate db streams
        const syncId = 'syncId_123'
        const dbStreams: SyncedStream[] = [
            {
                StreamId: 'streamId',
                UserIds: [],
                Kind: 'Channel',
                SyncCookie: generateFakeSyncCookie().toJsonString(),
            },
        ]
        mockDbSyncedStreamFindMany(dbStreams)
        // simulate the rpc response
        const mockStreamData = [
            {
                syncId,
                syncOp: SyncOp.SYNC_NEW,
            },
        ]
        mockRpcStreamData(mockStreamData, mockRpcClient.syncStreams as jest.Mock)
        // Simulate an asynchronous operation that changes syncState to Syncing
        const syncingPromise = newPromiseToWaitForSyncedStreamsState(
            syncedStreams,
            SyncState.Syncing,
        )
        // start syncing streams
        syncedStreams.startSyncStreams()

        // await the promise to ensure it resolves successfully
        await expect(syncingPromise).resolves.toBeUndefined()

        const syncCookie = generateFakeSyncCookie()
        await syncedStreams.addStreamToSync(syncCookie)

        expect(mockRpcClient.addStreamToSync).toHaveBeenCalledWith({
            syncId,
            syncPos: syncCookie,
        })
        await expect(syncedStreams.stopSync()).resolves.toBeUndefined()
    })

    it('should skip addStreamToSync if sync loop is NOT STARTED', () => {
        const syncCookie = generateFakeSyncCookie()
        syncedStreams.addStreamToSync(syncCookie)
        expect(mockRpcClient.addStreamToSync).not.toHaveBeenCalled()
    })

    it('should skip addStreamToSync if the sync loop is retrying', async () => {
        // simualate db streams
        const dbStreams: SyncedStream[] = [
            {
                StreamId: 'streamId',
                UserIds: [],
                Kind: 'Channel',
                SyncCookie: '',
            },
        ]
        mockDbSyncedStreamFindMany(dbStreams)
        // simulate an asynchronous operation that changes syncState to Retrying
        const retryingPromise = newPromiseToWaitForSyncedStreamsState(
            syncedStreams,
            SyncState.Retrying,
        )
        // start syncing streams
        syncedStreams.startSyncStreams()

        // await the promise to ensure it resolves successfully
        await expect(retryingPromise).resolves.toBeUndefined()

        const syncCookie = generateFakeSyncCookie()
        await syncedStreams.addStreamToSync(syncCookie)

        expect(mockRpcClient.addStreamToSync).not.toHaveBeenCalled()
        await expect(syncedStreams.stopSync()).resolves.toBeUndefined()
    })

    it('should remove stream to sync', async () => {
        // simualate db streams
        const syncId = 'syncId_123'
        const streamId = '20c2584fe85b9a83c2b25dbeb338cf07e53ad47714521ed7215dca3740f769c4'
        const dbStreams: SyncedStream[] = [
            {
                StreamId: streamId,
                UserIds: [],
                Kind: 'Channel',
                SyncCookie: generateFakeSyncCookie().toJsonString(),
            },
        ]
        mockDbSyncedStreamFindMany(dbStreams)
        // simulate the rpc response
        const mockStreamData = [
            {
                syncId,
                syncOp: SyncOp.SYNC_NEW,
            },
        ]
        mockRpcStreamData(mockStreamData, mockRpcClient.syncStreams as jest.Mock)
        // Simulate an asynchronous operation that changes syncState to Syncing
        const syncingPromise = newPromiseToWaitForSyncedStreamsState(
            syncedStreams,
            SyncState.Syncing,
        )
        // start syncing streams
        syncedStreams.startSyncStreams()

        // await the promise to ensure it resolves successfully
        await expect(syncingPromise).resolves.toBeUndefined()

        const syncCookie = generateFakeSyncCookie()
        syncedStreams.addStreamToSync(syncCookie)

        // remove the stream
        await syncedStreams.removeStreamFromSync(streamId)

        expect(mockRpcClient.removeStreamFromSync).toHaveBeenCalledWith({
            syncId,
            streamId: streamIdToBytes(streamId),
        })

        await expect(syncedStreams.stopSync()).resolves.toBeUndefined()
    })

    it('should skip removeStreamFromSync if sync loop is NOT STARTED', () => {
        const streamId = '20c2584fe85b9a83c2b25dbeb338cf07e53ad47714521ed7215dca3740f769c4'
        syncedStreams.removeStreamFromSync(streamId)
        expect(mockRpcClient.removeStreamFromSync).not.toHaveBeenCalled()
    })

    it('should skip removeStreamFromSync if the sync loop is retrying', async () => {
        // simualate db streams
        const streamId = '20c2584fe85b9a83c2b25dbeb338cf07e53ad47714521ed7215dca3740f769c4'
        const dbStreams: SyncedStream[] = [
            {
                StreamId: streamId,
                UserIds: [],
                Kind: 'Channel',
                SyncCookie: '',
            },
        ]
        mockDbSyncedStreamFindMany(dbStreams)
        // simulate an asynchronous operation that changes syncState to Retrying
        const retryingPromise = newPromiseToWaitForSyncedStreamsState(
            syncedStreams,
            SyncState.Retrying,
        )
        // start syncing streams
        syncedStreams.startSyncStreams()

        // await the promise to ensure it resolves successfully
        await expect(retryingPromise).resolves.toBeUndefined()

        // remove the stream
        await syncedStreams.removeStreamFromSync(streamId)

        expect(mockRpcClient.removeStreamFromSync).not.toHaveBeenCalled()
        await expect(syncedStreams.stopSync()).resolves.toBeUndefined()
    })
})
