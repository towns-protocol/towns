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
    CancelSyncRequest,
    CancelSyncResponse,
    CachedMiniblock,
    CachedEvent,
    CachedStreamResponse,
    CachedStreamAndCookie,
} from '@river/proto'
import { PromiseClient, CallOptions } from '@connectrpc/connect'
import { PartialMessage } from '@bufbuild/protobuf'
import { StreamRpcClientType } from './makeStreamRpcClient'
import { unpackMiniblock, unpackStreamResponse } from './sign'
import { ParsedEvent, ParsedMiniblock, ParsedStreamAndCookie, ParsedStreamResponse } from './types'
import { Cache } from './cache'
import { bin_equal } from './binary'
import { isDefined } from './check'
import { dlog } from './dlog'

export class CachingStreamRpcClient implements StreamRpcClientType {
    log = dlog('csb:streams:rpc-cache')

    constructor(private rpcClient: PromiseClient<typeof StreamService>) {}

    async getStream(
        request: PartialMessage<GetStreamRequest>,
        options?: CallOptions,
    ): Promise<GetStreamResponse> {
        return this.rpcClient.getStream(request, options)
    }

    async getStreamUnpacked(
        request: PartialMessage<GetStreamRequest>,
        options?: CallOptions,
    ): Promise<ParsedStreamResponse> {
        if (!request.streamId) {
            const response = await this.rpcClient.getStream(request, options)
            return unpackStreamResponse(response)
        }

        const cache = await Cache.open('get-stream')
        const cacheKey = `/getstreamunpacked-${request.streamId}`

        /**
         * We can improve app performance and decrease the load on the nodes a bit here by checking
         * if we have the stream in the cache.
         */
        const streamId = request.streamId
        const bytes = await cache.match(cacheKey)
        if (bytes) {
            try {
                const cachedResponse = CachedStreamResponse.fromBinary(bytes)
                const parsedResponse = cachedStreamResponseToGetStreamResponse(cachedResponse)

                if (parsedResponse) {
                    const lastMiniblockHash = await this.getLastMiniblockHash({ streamId })
                    const currentKnownHash = parsedResponse.miniblocks.at(-1)?.hash
                    if (currentKnownHash && bin_equal(lastMiniblockHash.hash, currentKnownHash)) {
                        this.log('Cache hit for stream', streamId)
                        return parsedResponse
                    }
                }
            } catch (_) {
                this.log('Deserialization error for stream', streamId)
            }
        }

        const response = await this.rpcClient.getStream(request, options)
        const parsedResponse = unpackStreamResponse(response)

        const cachedResponse = parsedStreamToCachedStream(parsedResponse)
        await cache.put(cacheKey, cachedResponse.toBinary())
        return parsedResponse
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
            return `/unpacked-miniblock-${miniblockNum}-${request.streamId}`
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
        const parsedMiniblocks: ParsedMiniblock[] = []
        if (cache) {
            for (let i = toExclusive - 1n; i >= fromInclusive; i = i - 1n) {
                const key = genKey(i)
                const bytes = await cache.match(key)
                try {
                    if (bytes) {
                        const cachedMiniblock = CachedMiniblock.fromBinary(bytes)
                        const unpackedMiniblock = cachedMiniblockToMiniblock(cachedMiniblock)
                        if (!unpackedMiniblock) {
                            break
                        }

                        // Insert the found miniblock at the first position of the array
                        parsedMiniblocks.push(unpackedMiniblock)
                        toExclusive = i
                    } else {
                        break
                    }
                } catch (_) {
                    break
                }
            }
        }
        // The miniblocks have been fetched backwards from the cache,
        // need to reverse the array to get them in the correct order
        parsedMiniblocks.reverse()

        /**
         * This means that we had _all_ the miniblocks cached, so we can return them immediately.
         * terminus should be true if we're requesting the first miniblock in the stream.
         */
        if (toExclusive === fromInclusive) {
            return {
                unpackedMiniblocks: parsedMiniblocks,
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
            const unpacked = parsedMiniblockToCachedMiniblock(unpackedMiniblock)
            unpackedMiniblocks.push(unpackedMiniblock)
            await cache.put(genKey(unpackedMiniblock.header.miniblockNum), unpacked.toBinary())
        }

        /**
         * Combine the cached results with the fetched results.
         */
        return {
            terminus: response.terminus,
            unpackedMiniblocks: [...unpackedMiniblocks, ...parsedMiniblocks],
        }
    }
}

function cachedEventToParsedEvent(event: CachedEvent): ParsedEvent | undefined {
    if (!event.event || !event.envelope) {
        return undefined
    }
    return {
        event: event.event,
        envelope: event.envelope,
        hashStr: event.hashStr,
        prevMiniblockHashStr:
            event.prevMiniblockHashStr.length > 0 ? event.prevMiniblockHashStr : undefined,
        creatorUserId: event.creatorUserId,
    }
}

function cachedStreamResponseToGetStreamResponse(
    response: CachedStreamResponse,
): ParsedStreamResponse | undefined {
    if (!response.streamAndCookie || !response.snapshot) {
        return undefined
    }
    const streamAndCookie = cachedStreamAndCookieToParsedStreamAndCookie(response.streamAndCookie)
    if (!streamAndCookie) {
        return undefined
    }
    return {
        streamAndCookie: streamAndCookie,
        snapshot: response.snapshot,
        miniblocks: response.miniblocks.map(cachedMiniblockToMiniblock).filter(isDefined),
        prevSnapshotMiniblockNum: response.prevSnapshotMiniblockNum,
        eventIds: response.eventIds,
    }
}

function cachedStreamAndCookieToParsedStreamAndCookie(
    response: CachedStreamAndCookie,
): ParsedStreamAndCookie | undefined {
    if (!response.nextSyncCookie) {
        return undefined
    }
    return {
        events: response.events.map(cachedEventToParsedEvent).filter(isDefined),
        nextSyncCookie: response.nextSyncCookie,
        startSyncCookie: response.startSyncCookie,
    }
}

function cachedMiniblockToMiniblock(miniblock: CachedMiniblock): ParsedMiniblock | undefined {
    if (!miniblock.header) {
        return undefined
    }
    return {
        hash: miniblock.hash,
        header: miniblock.header,
        events: miniblock.events.map(cachedEventToParsedEvent).filter(isDefined),
    }
}

function parsedStreamToCachedStream(response: ParsedStreamResponse) {
    return new CachedStreamResponse({
        streamAndCookie: parsedStreamAndCookieToCachedStreamAndCookie(response.streamAndCookie),
        snapshot: response.snapshot,
        miniblocks: response.miniblocks.map(parsedMiniblockToCachedMiniblock),
        prevSnapshotMiniblockNum: response.prevSnapshotMiniblockNum,
        eventIds: response.eventIds,
    })
}

function parsedStreamAndCookieToCachedStreamAndCookie(
    response: ParsedStreamAndCookie,
): CachedStreamAndCookie {
    return new CachedStreamAndCookie({
        events: response.events.map(parsedEventToCachedEvent),
        nextSyncCookie: response.nextSyncCookie,
        startSyncCookie: response.startSyncCookie,
    })
}

function parsedMiniblockToCachedMiniblock(miniblock: ParsedMiniblock) {
    return new CachedMiniblock({
        hash: miniblock.hash,
        header: miniblock.header,
        events: miniblock.events.map(parsedEventToCachedEvent),
    })
}

function parsedEventToCachedEvent(event: ParsedEvent) {
    return new CachedEvent({
        event: event.event,
        envelope: event.envelope,
        hashStr: event.hashStr,
        prevMiniblockHashStr: event.prevMiniblockHashStr,
        creatorUserId: event.creatorUserId,
    })
}
