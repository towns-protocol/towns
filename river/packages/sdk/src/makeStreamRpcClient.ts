import { PromiseClient, createPromiseClient } from '@connectrpc/connect'
import { ConnectTransportOptions as ConnectTransportOptionsWeb } from '@connectrpc/connect-web'
import { StreamService } from '@river-build/proto'
import { dlog } from '@river-build/dlog'
import { getEnvVar, randomUrlSelector } from './utils'
import {
    DEFAULT_RETRY_PARAMS,
    getRetryDelayMs,
    loggingInterceptor,
    retryInterceptor,
    type RetryParams,
} from './rpcInterceptors'
import { UnpackEnvelopeOpts, unpackMiniblock } from './sign'
import { RpcOptions, createHttp2ConnectTransport } from './rpcCommon'
import { streamIdAsBytes } from './id'
import { ParsedMiniblock } from './types'

const logInfo = dlog('csb:rpc:info')
let nextRpcClientNum = 0

export interface StreamRpcClientOptions {
    retryParams: RetryParams
}

export type StreamRpcClient = PromiseClient<typeof StreamService> & {
    url: string
    opts: StreamRpcClientOptions
}
export type MakeRpcClientType = typeof makeStreamRpcClient

export function makeStreamRpcClient(
    dest: string,
    refreshNodeUrl?: () => Promise<string>,
    opts?: RpcOptions,
): StreamRpcClient {
    const transportId = nextRpcClientNum++
    const retryParams = opts?.retryParams ?? DEFAULT_RETRY_PARAMS
    logInfo('makeStreamRpcClient, transportId =', transportId)
    const url = randomUrlSelector(dest)
    logInfo('makeStreamRpcClient: Connecting to url=', url, ' allUrls=', dest)
    const options: ConnectTransportOptionsWeb = {
        baseUrl: url,
        interceptors: [
            ...(opts?.interceptors ?? []),
            loggingInterceptor(transportId),
            retryInterceptor({ ...retryParams, refreshNodeUrl }),
        ],
        defaultTimeoutMs: undefined, // default timeout is undefined, we add a timeout in the retryInterceptor
    }
    if (getEnvVar('RIVER_DEBUG_TRANSPORT') !== 'true') {
        options.useBinaryFormat = true
    } else {
        logInfo('makeStreamRpcClient: running in debug mode, using JSON format')
        options.useBinaryFormat = false
        options.jsonOptions = {
            emitDefaultValues: true,
            useProtoFieldName: true,
        }
    }
    const transport = createHttp2ConnectTransport(options)

    const client: StreamRpcClient = createPromiseClient(StreamService, transport) as StreamRpcClient
    client.url = url
    client.opts = { retryParams }
    return client
}

export function getMaxTimeoutMs(opts: StreamRpcClientOptions): number {
    let maxTimeoutMs = 0
    for (let i = 1; i <= opts.retryParams.maxAttempts; i++) {
        maxTimeoutMs +=
            opts.retryParams.defaultTimeoutMs ?? 0 + getRetryDelayMs(i, opts.retryParams)
    }
    return maxTimeoutMs
}

export async function getMiniblocks(
    client: StreamRpcClient,
    streamId: string | Uint8Array,
    fromInclusive: bigint,
    toExclusive: bigint,
    unpackEnvelopeOpts: UnpackEnvelopeOpts | undefined,
): Promise<{ miniblocks: ParsedMiniblock[]; terminus: boolean }> {
    const allMiniblocks: ParsedMiniblock[] = []
    let currentFromInclusive = fromInclusive
    let reachedTerminus = false

    while (currentFromInclusive < toExclusive) {
        const { miniblocks, terminus, nextFromInclusive } = await fetchMiniblocksFromRpc(
            client,
            streamId,
            currentFromInclusive,
            toExclusive,
            unpackEnvelopeOpts,
        )

        allMiniblocks.push(...miniblocks)
        currentFromInclusive = nextFromInclusive

        // Set the terminus to true if we got at least one response with reached terminus
        // The behaviour around this flag is not implemented yet
        if (terminus && !reachedTerminus) {
            reachedTerminus = true
        }
    }

    return {
        miniblocks: allMiniblocks,
        terminus: reachedTerminus,
    }
}

export async function fetchMiniblocksFromRpc(
    client: StreamRpcClient,
    streamId: string | Uint8Array,
    fromInclusive: bigint,
    toExclusive: bigint,
    unpackEnvelopeOpts: UnpackEnvelopeOpts | undefined,
): Promise<{
    miniblocks: ParsedMiniblock[]
    terminus: boolean
    nextFromInclusive: bigint
}> {
    const response = await client.getMiniblocks({
        streamId: streamIdAsBytes(streamId),
        fromInclusive,
        toExclusive,
    })

    const miniblocks: ParsedMiniblock[] = []
    for (const miniblock of response.miniblocks) {
        const unpackedMiniblock = await unpackMiniblock(miniblock, unpackEnvelopeOpts)
        miniblocks.push(unpackedMiniblock)
    }

    return {
        miniblocks: miniblocks,
        terminus: response.terminus,
        nextFromInclusive: response.fromInclusive + BigInt(response.miniblocks.length),
    }
}
