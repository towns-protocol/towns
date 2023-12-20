import { Client } from './client'
import { makeTestClient } from './util.test'
import { Cache } from './cache'
import { jest } from '@jest/globals'
import { GetMiniblocksRequest } from '@river/proto'

class MockCache extends Cache {
    mockStorage = new Map<string, Uint8Array>()

    async match(request: string): Promise<Uint8Array | undefined> {
        return this.mockStorage.get(request)
    }

    async put(request: string, data: Uint8Array): Promise<void> {
        this.mockStorage.set(request, data)
    }
}

describe('cachingStreamRpcClientTests', () => {
    let bobClient: Client
    let openSpy: any
    let matchSpy: any
    let putSpy: any

    beforeEach(async () => {
        const cache = new MockCache()
        bobClient = await makeTestClient()
        openSpy = jest.spyOn(Cache, 'open').mockImplementation(async () => cache)
        matchSpy = jest.spyOn(MockCache.prototype, 'match')
        putSpy = jest.spyOn(MockCache.prototype, 'put')
    })

    test('miniblockAreFetchedFromCache', async () => {
        await bobClient.initializeUser()
        await bobClient.startSync()

        const { streamId: spaceId } = await bobClient.createSpace(undefined)
        const { streamId: channelId } = await bobClient.createChannel(
            spaceId,
            'name',
            'topic',
            undefined,
            { minEventsPerSnapshot: 0, miniblockTimeMs: 1n },
        )

        await bobClient.waitForStream(channelId)

        for (let i = 0; i < 50; i++) {
            await expect(bobClient.sendMessage(channelId, `message ${i}`)).toResolve()
        }

        const stream = await bobClient.getStream(channelId)
        const miniblockInfo = stream.miniblockInfo!

        expect(miniblockInfo.max).toBe(50n)
        expect(miniblockInfo.min).toBe(0n)

        const cachingRpcClient = bobClient.rpcClient
        const miniblocksRequest = new GetMiniblocksRequest({
            streamId: channelId,
            fromInclusive: 0n,
            toExclusive: 50n,
        })

        // Reset all mock counters etc
        jest.clearAllMocks()

        // We're making 2 RPC calls, the first one should be uncached and the
        // second one should be cached. The responses should be equal.
        const uncachedResponse = await cachingRpcClient.getMiniblocksUnpacked(miniblocksRequest)
        expect(uncachedResponse.terminus).toBe(true)
        expect(uncachedResponse.unpackedMiniblocks.length).toBe(50)

        // The first time, we expect the cache to be empty and `match` to have been called 1 time
        expect(openSpy).toHaveBeenCalledTimes(1)
        expect(matchSpy).toHaveBeenCalledTimes(1)
        // 50 objects added to cache
        expect(putSpy).toHaveBeenCalledTimes(50)

        const cachedResponse = await cachingRpcClient.getMiniblocksUnpacked(miniblocksRequest)

        // The second time, we expect the cache to be populated and match to be called
        // 50 more times, one for each miniblock
        expect(openSpy).toHaveBeenCalledTimes(2)
        expect(matchSpy).toHaveBeenCalledTimes(51)

        // We do not expect put to have been called again
        expect(putSpy).toHaveBeenCalledTimes(50)

        // The cached/uncached responses must be equal
        expect(cachedResponse.unpackedMiniblocks).toEqual(uncachedResponse.unpackedMiniblocks)
        await bobClient.stopSync()
    })

    test('getStreamIsFetchedFromCache', async () => {
        await bobClient.initializeUser()
        await bobClient.startSync()

        const { streamId: spaceId } = await bobClient.createSpace(undefined)
        const { streamId: channelId } = await bobClient.createChannel(
            spaceId,
            'name',
            'topic',
            undefined,
            { minEventsPerSnapshot: 0, miniblockTimeMs: 1n },
        )

        await bobClient.waitForStream(channelId)

        for (let i = 0; i < 50; i++) {
            await expect(bobClient.sendMessage(channelId, `message ${i}`)).toResolve()
        }

        // Reset all mock counters etc
        jest.clearAllMocks()

        const uncachedResponse = await bobClient.rpcClient.getStreamUnpacked({
            streamId: channelId,
        })
        // The first time, we expect the cache to be empty and match to be called 1 time
        expect(openSpy).toHaveBeenCalledTimes(1)
        expect(matchSpy).toHaveBeenCalledTimes(1)

        // `Cache.put` called once
        expect(putSpy).toHaveBeenCalledTimes(1)

        // The second time we expect a cache hit
        const cachedResponse = await bobClient.rpcClient.getStreamUnpacked({ streamId: channelId })
        expect(openSpy).toHaveBeenCalledTimes(2)
        expect(matchSpy).toHaveBeenCalledTimes(2)
        // `Cache.put` still called only once since this was a cache hit
        expect(putSpy).toHaveBeenCalledTimes(1)

        expect(cachedResponse).toEqual(uncachedResponse)
        bobClient.stopSync()
    })
})
