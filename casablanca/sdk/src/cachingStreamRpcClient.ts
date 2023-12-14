import {
    StreamService,
    CreateStreamRequest,
    AddStreamToSyncRequest,
    AddStreamToSyncResponse,
    RemoveStreamFromSyncRequest,
    RemoveStreamFromSyncResponse,
    AddEventRequest,
    AddEventResponse,
    CreateStreamResponse,
    GetLastMiniblockHashRequest,
    GetLastMiniblockHashResponse,
    GetMiniblocksRequest,
    GetMiniblocksResponse,
    GetStreamRequest,
    GetStreamResponse,
    InfoRequest,
    InfoResponse,
    SyncStreamsRequest,
    SyncStreamsResponse,
    Miniblock,
    CancelSyncRequest,
    CancelSyncResponse,
} from '@river/proto'
import { PromiseClient, CallOptions } from '@connectrpc/connect'
import { PartialMessage } from '@bufbuild/protobuf'
import { StreamRpcClientType } from './makeStreamRpcClient'
import { unpackMiniblock } from './sign'
import { ParsedMiniblock } from './types'
import { Cache } from './cache'
import { bin_equal } from './binary'

export class CachingStreamRpcClient implements StreamRpcClientType {
    constructor(private rpcClient: PromiseClient<typeof StreamService>) {}

    async getStream(
        request: PartialMessage<GetStreamRequest>,
        options?: CallOptions,
    ): Promise<GetStreamResponse> {
        if (!request.streamId) {
            return this.rpcClient.getStream(request, options)
        }

        const cache = await Cache.open('get-stream')
        const cacheKey = `getstream-${request.streamId}`

        /**
         * We can improve app performance and decrease the load on the nodes a bit here by checking
         * if we have the stream in the cache.
         */
        const streamId = request.streamId
        const bytes = await cache.match(cacheKey)
        if (bytes) {
            const cachedResponse = GetStreamResponse.fromBinary(bytes)
            const lastMiniblockHash = await this.getLastMiniblockHash({ streamId })
            const currentKnownHash = cachedResponse.miniblocks.at(-1)?.header?.hash
            if (currentKnownHash && bin_equal(lastMiniblockHash.hash, currentKnownHash)) {
                return cachedResponse
            }
        }

        const response = await this.rpcClient.getStream(request, options)
        await cache.put(cacheKey, response.toBinary())
        return response
    }

    getMiniblocks(
        _request: PartialMessage<GetMiniblocksRequest>,
        _options?: CallOptions | undefined,
    ): Promise<GetMiniblocksResponse> {
        throw new Error('use `getMiniblocksUnpacked` instead')
    }

    addStreamToSync(
        request: PartialMessage<AddStreamToSyncRequest>,
        options?: CallOptions | undefined,
    ): Promise<AddStreamToSyncResponse> {
        return this.rpcClient.addStreamToSync(request, options)
    }

    removeStreamFromSync(
        request: PartialMessage<RemoveStreamFromSyncRequest>,
        options?: CallOptions | undefined,
    ): Promise<RemoveStreamFromSyncResponse> {
        return this.rpcClient.removeStreamFromSync(request, options)
    }

    cancelSync(
        request: PartialMessage<CancelSyncRequest>,
        options?: CallOptions | undefined,
    ): Promise<CancelSyncResponse> {
        return this.rpcClient.cancelSync(request, options)
    }

    createStream(
        request: PartialMessage<CreateStreamRequest>,
        options?: CallOptions,
    ): Promise<CreateStreamResponse> {
        return this.rpcClient.createStream(request, options)
    }

    getLastMiniblockHash(
        request: PartialMessage<GetLastMiniblockHashRequest>,
        options?: CallOptions | undefined,
    ): Promise<GetLastMiniblockHashResponse> {
        return this.rpcClient.getLastMiniblockHash(request, options)
    }

    addEvent(
        request: PartialMessage<AddEventRequest>,
        options?: CallOptions | undefined,
    ): Promise<AddEventResponse> {
        return this.rpcClient.addEvent(request, options)
    }

    syncStreams(
        request: PartialMessage<SyncStreamsRequest>,
        options?: CallOptions | undefined,
    ): AsyncIterable<SyncStreamsResponse> {
        return this.rpcClient.syncStreams(request, options)
    }

    info(
        request: PartialMessage<InfoRequest>,
        options?: CallOptions | undefined,
    ): Promise<InfoResponse> {
        return this.rpcClient.info(request, options)
    }

    async getMiniblocksUnpacked(
        request: PartialMessage<GetMiniblocksRequest>,
        options?: CallOptions,
    ): Promise<{ terminus: boolean; unpackedMiniblocks: ParsedMiniblock[] }> {
        if (
            request.fromInclusive === undefined ||
            request.streamId === undefined ||
            request.toExclusive === undefined
        ) {
            const response = await this.rpcClient.getMiniblocks(request, options)
            return {
                terminus: response.terminus,
                unpackedMiniblocks: response.miniblocks.map(unpackMiniblock),
            }
        }

        function genKey(miniblockNum: bigint) {
            return `miniblock-${miniblockNum}-${request.streamId}`
        }

        /**
         * Miniblocks are synced backwards, so we'll look them up in reverse order, starting from
         * `toExclusive - 1n`. We do not support 'gaps' in the cache, so if we can't find a miniblock,
         * we'll immediately stop looking and fetch the rest from the nodes.
         */

        // caches may be undefined during tests
        const cache = await Cache.open('get-miniblocks')
        const fromInclusive = request.fromInclusive
        const streamId = request.streamId
        let toExclusive = request.toExclusive
        const cachedMiniblocks: ParsedMiniblock[] = []
        if (cache) {
            for (let i = toExclusive - 1n; i >= fromInclusive; i = i - 1n) {
                const key = genKey(i)
                const bytes = await cache.match(key)
                if (bytes) {
                    const cachedMiniblock = Miniblock.fromBinary(bytes)
                    // Insert the found miniblock at the first position of the array
                    cachedMiniblocks.push(unpackMiniblock(cachedMiniblock))
                    toExclusive = i
                } else {
                    break
                }
            }
        }
        // The miniblocks have been fetched backwards from the cache,
        // need to reverse the array to get them in the correct order
        cachedMiniblocks.reverse()

        /**
         * This means that we had _all_ the miniblocks cached, so we can return them immediately.
         * terminus should be true if we're requesting the first miniblock in the stream.
         */
        if (toExclusive === fromInclusive) {
            return {
                unpackedMiniblocks: cachedMiniblocks,
                terminus: toExclusive === 0n,
            }
        }

        const response = await this.rpcClient.getMiniblocks(
            { fromInclusive, streamId, toExclusive },
            options,
        )

        const unpackedMiniblocks: ParsedMiniblock[] = []
        for (const miniblock of response.miniblocks) {
            const unpackedMiniblock = unpackMiniblock(miniblock)
            unpackedMiniblocks.push(unpackedMiniblock)
            await cache.put(genKey(unpackedMiniblock.header.miniblockNum), miniblock.toBinary())
        }

        /**
         * Combine the cached results with the fetched results.
         */
        return {
            terminus: response.terminus,
            unpackedMiniblocks: [...unpackedMiniblocks, ...cachedMiniblocks],
        }
    }
}
