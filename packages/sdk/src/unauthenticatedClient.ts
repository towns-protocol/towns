import debug from 'debug'
import { DLogger, check, dlog, dlogError } from '@towns-protocol/dlog'
import { PayloadCaseType, ContentCaseType } from '@towns-protocol/proto'
import { hasElements, isDefined } from './check'
import { StreamRpcClient, getMiniblocks } from './makeStreamRpcClient'
import { UnpackEnvelopeOpts, unpackStream } from './sign'
import { StreamStateView } from './streamStateView'
import { ParsedMiniblock } from './types'
import { streamIdAsString, streamIdAsBytes, userIdFromAddress, makeUserStreamId } from './id'
import { StreamsView } from './views/streamsView'

const SCROLLBACK_MULTIPLIER = 4n
export class UnauthenticatedClient {
    readonly rpcClient: StreamRpcClient

    private readonly logCall: DLogger
    private readonly logEmitFromClient: DLogger
    private readonly logError: DLogger
    private readonly unpackEnvelopeOpts: UnpackEnvelopeOpts

    private readonly userId = 'unauthenticatedClientUser'
    private getScrollbackRequests: Map<string, ReturnType<typeof this.scrollback>> = new Map()

    constructor(
        rpcClient: StreamRpcClient,
        logNamespaceFilter?: string,
        // this client is used for viewing public streams, disable signature and hash validation to make it as fast as possible
        opts: UnpackEnvelopeOpts = {
            disableSignatureValidation: true,
            disableHashValidation: true,
        },
    ) {
        if (logNamespaceFilter) {
            debug.enable(logNamespaceFilter)
        }

        this.rpcClient = rpcClient

        const shortId = 'unauthClientShortId'

        this.logCall = dlog('csb:cl:call').extend(shortId)
        this.logEmitFromClient = dlog('csb:cl:emit').extend(shortId)
        this.logError = dlogError('csb:cl:error').extend(shortId)

        this.unpackEnvelopeOpts = opts

        this.logCall('new UnauthenticatedClient')
    }

    async userWithAddressExists(address: Uint8Array): Promise<boolean> {
        return this.userExists(userIdFromAddress(address))
    }

    async userExists(userId: string): Promise<boolean> {
        const userStreamId = makeUserStreamId(userId)
        return this.streamExists(userStreamId)
    }

    async streamExists(streamId: string | Uint8Array): Promise<boolean> {
        this.logCall('streamExists?', streamId)
        const response = await this.rpcClient.getStream({
            streamId: streamIdAsBytes(streamId),
            optional: true,
        })
        this.logCall('streamExists=', streamId, response.stream)
        return response.stream !== undefined
    }

    async getStream(
        streamId: string | Uint8Array,
        streamsView?: StreamsView,
    ): Promise<StreamStateView> {
        try {
            this.logCall('getStream', streamId)
            const response = await this.rpcClient.getStream({ streamId: streamIdAsBytes(streamId) })
            this.logCall('getStream', response.stream)
            check(
                isDefined(response.stream) && hasElements(response.stream.miniblocks),
                'got bad stream',
            )
            const { streamAndCookie, snapshot, prevSnapshotMiniblockNum } = await unpackStream(
                response.stream,
                this.unpackEnvelopeOpts,
            )
            const streamView = new StreamStateView(
                this.userId,
                streamIdAsString(streamId),
                streamsView,
            )

            streamView.initialize(
                streamAndCookie.nextSyncCookie,
                streamAndCookie.events,
                snapshot,
                streamAndCookie.miniblocks,
                [],
                prevSnapshotMiniblockNum,
                undefined,
                [],
                undefined,
            )
            return streamView
        } catch (err) {
            this.logCall('getStream', streamId, 'ERROR', err)
            throw err
        }
    }

    async scrollback(
        streamView: StreamStateView,
    ): Promise<{ terminus: boolean; fromInclusiveMiniblockNum: bigint }> {
        const currentRequest = this.getScrollbackRequests.get(streamView.streamId)
        if (currentRequest) {
            return currentRequest
        }

        const _scrollback = async (): Promise<{
            terminus: boolean
            fromInclusiveMiniblockNum: bigint
        }> => {
            check(
                isDefined(streamView.miniblockInfo),
                `stream not initialized: ${streamView.streamId}`,
            )
            if (streamView.miniblockInfo.terminusReached) {
                this.logCall('scrollback', streamView.streamId, 'terminus reached')
                return {
                    terminus: true,
                    fromInclusiveMiniblockNum: streamView.miniblockInfo.min,
                }
            }
            check(streamView.miniblockInfo.min >= streamView.prevSnapshotMiniblockNum)
            this.logCall('scrollback', {
                streamId: streamView.streamId,
                miniblockInfo: streamView.miniblockInfo,
                prevSnapshotMiniblockNum: streamView.prevSnapshotMiniblockNum,
            })
            const toExclusive = streamView.miniblockInfo.min
            const fromInclusive = streamView.prevSnapshotMiniblockNum
            const span = toExclusive - fromInclusive
            let fromInclusiveNew = toExclusive - span * SCROLLBACK_MULTIPLIER
            fromInclusiveNew = fromInclusiveNew < 0n ? 0n : fromInclusiveNew
            const response = await this.getMiniblocks(
                streamView.streamId,
                fromInclusiveNew,
                toExclusive,
            )

            // a race may occur here: if the state view has been reinitialized during the scrollback
            // request, we need to discard the new miniblocks.
            if (streamView.miniblockInfo.min === toExclusive) {
                streamView.prependEvents(
                    response.miniblocks,
                    undefined,
                    response.terminus,
                    undefined,
                    undefined,
                )
                return {
                    terminus: response.terminus,
                    fromInclusiveMiniblockNum: streamView.miniblockInfo.min,
                }
            }
            return {
                terminus: false,
                fromInclusiveMiniblockNum: streamView.miniblockInfo.min,
            }
        }

        try {
            const request = _scrollback()
            this.getScrollbackRequests.set(streamView.streamId, request)
            return await request
        } finally {
            this.getScrollbackRequests.delete(streamView.streamId)
        }
    }

    private async getMiniblocks(
        streamId: string | Uint8Array,
        fromInclusive: bigint,
        toExclusive: bigint,
        exclusionFilter?: { payload: PayloadCaseType; content: ContentCaseType }[],
    ): Promise<{ miniblocks: ParsedMiniblock[]; terminus: boolean }> {
        if (toExclusive === fromInclusive) {
            return {
                miniblocks: [],
                terminus: toExclusive === 0n,
            }
        }

        const { miniblocks, terminus } = await getMiniblocks(
            this.rpcClient,
            streamId,
            fromInclusive,
            toExclusive,
            true,
            exclusionFilter,
            this.unpackEnvelopeOpts,
        )

        return {
            terminus: terminus,
            miniblocks: miniblocks,
        }
    }

    private isWithin(number: number | bigint, time: number) {
        const minEpochMs = Date.now() - time
        return number > minEpochMs
    }
}
