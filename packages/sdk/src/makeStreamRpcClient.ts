import { Client, ConnectTransportOptions, createClient } from '@towns-protocol/rpc-connector/common'
import { createHttp2ConnectTransport } from '@towns-protocol/rpc-connector'
import { Snapshot, StreamService } from '@towns-protocol/proto'
import { dlog } from '@towns-protocol/utils'
import { getEnvVar, randomUrlSelector } from './utils'
import { snakeCase } from 'lodash-es'
import {
    DEFAULT_RETRY_PARAMS,
    getRetryDelayMs,
    loggingInterceptor,
    retryInterceptor,
    setHeaderInterceptor,
    type RetryParams,
} from './rpcInterceptors'
import { UnpackEnvelopeOpts, unpackMiniblock, unpackSnapshot } from './sign'
import { RpcOptions } from './rpcCommon'
import { streamIdAsBytes } from './id'
import { ParsedMiniblock, ExclusionFilter } from './types'
import packageJson from '../package.json' assert { type: 'json' }

const logInfo = dlog('csb:rpc:info')
let nextRpcClientNum = 0

export interface StreamRpcClientOptions {
    retryParams: RetryParams
}

export type StreamRpcClient = Client<typeof StreamService> & {
    url: string
    opts: StreamRpcClientOptions
}

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
    const options: ConnectTransportOptions = {
        baseUrl: url,
        interceptors: [
            ...(opts?.interceptors ?? []),
            setHeaderInterceptor({ Version: packageJson.version }),
            loggingInterceptor(transportId),
            retryInterceptor({ ...retryParams, refreshNodeUrl }),
        ],
        defaultTimeoutMs: undefined, // default timeout is undefined, we add a timeout in the retryInterceptor
    }
    // Inject test-only entitlement bypass header when configured via env (used by SDK tests).
    const testBypassSecret = getEnvVar('RIVER_TEST_ENT_BYPASS_SECRET')
    if (testBypassSecret) {
        options.interceptors?.unshift(
            setHeaderInterceptor({ 'X-River-Test-Bypass': testBypassSecret }),
        )
    }
    if (getEnvVar('RIVER_DEBUG_TRANSPORT') !== 'true') {
        options.useBinaryFormat = true
    } else {
        logInfo('makeStreamRpcClient: running in debug mode, using JSON format')
        options.useBinaryFormat = false
        options.jsonOptions = {
            alwaysEmitImplicit: true,
            useProtoFieldName: true,
        }
    }
    const transport = createHttp2ConnectTransport(options)

    const client = createClient(StreamService, transport) as StreamRpcClient
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
    omitSnapshots: boolean,
    exclusionFilter: ExclusionFilter | undefined,
    unpackEnvelopeOpts: UnpackEnvelopeOpts | undefined,
): Promise<{
    miniblocks: ParsedMiniblock[]
    terminus: boolean
    snapshots?: Record<string, Snapshot>
}> {
    const allMiniblocks: ParsedMiniblock[] = []
    let currentFromInclusive = fromInclusive
    let reachedTerminus = false
    const parsedSnapshots: Record<string, Snapshot> = {}

    while (currentFromInclusive < toExclusive) {
        const { miniblocks, terminus, nextFromInclusive, snapshots } = await fetchMiniblocksFromRpc(
            client,
            streamId,
            currentFromInclusive,
            toExclusive,
            omitSnapshots,
            exclusionFilter,
            unpackEnvelopeOpts,
        )

        allMiniblocks.push(...miniblocks)
        if (!omitSnapshots) {
            Object.entries(snapshots).forEach(([key, snapshot]) => {
                parsedSnapshots[key] = snapshot
            })
        }

        // Set the terminus to true if we got at least one response with reached terminus
        // The behaviour around this flag is not implemented yet
        if (terminus && !reachedTerminus) {
            reachedTerminus = true
        }

        if (currentFromInclusive === nextFromInclusive) {
            break
        }

        currentFromInclusive = nextFromInclusive
    }

    return {
        miniblocks: allMiniblocks,
        terminus: reachedTerminus,
        snapshots: parsedSnapshots,
    }
}

async function fetchMiniblocksFromRpc(
    client: StreamRpcClient,
    streamId: string | Uint8Array,
    fromInclusive: bigint,
    toExclusive: bigint,
    omitSnapshots: boolean,
    exclusionFilter: ExclusionFilter | undefined,
    unpackEnvelopeOpts: UnpackEnvelopeOpts | undefined,
) {
    const response = await client.getMiniblocks({
        streamId: streamIdAsBytes(streamId),
        fromInclusive,
        toExclusive,
        omitSnapshots,
        exclusionFilter:
            exclusionFilter?.map(({ payload, content }) => ({
                payload: snakeCase(payload),
                content: snakeCase(content),
            })) ?? [],
    })

    const miniblocks: ParsedMiniblock[] = []
    const parsedSnapshots: Record<string, Snapshot> = {}
    for (const miniblock of response.miniblocks) {
        const unpackedMiniblock = await unpackMiniblock(miniblock, unpackEnvelopeOpts)
        const unpackedMiniblockNum = unpackedMiniblock.header.miniblockNum.toString()
        miniblocks.push(unpackedMiniblock)
        if (!omitSnapshots && response.snapshots[unpackedMiniblockNum]) {
            parsedSnapshots[unpackedMiniblockNum] = (
                await unpackSnapshot(
                    unpackedMiniblock.events.at(-1)?.event,
                    unpackedMiniblock.header.snapshotHash,
                    response.snapshots[unpackedMiniblockNum],
                    unpackEnvelopeOpts,
                )
            ).snapshot
        }
    }

    const respondedFromInclusive =
        miniblocks.length > 0 ? miniblocks[0].header.miniblockNum : fromInclusive

    return {
        miniblocks: miniblocks,
        terminus: response.terminus,
        nextFromInclusive: respondedFromInclusive + BigInt(response.miniblocks.length),
        snapshots: parsedSnapshots,
    }
}
