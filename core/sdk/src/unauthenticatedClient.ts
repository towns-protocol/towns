import debug from 'debug'
import { DLogger, check, dlog, dlogError } from '@river/dlog'
import { hasElements, isDefined } from './check'
import { StreamRpcClientType } from './makeStreamRpcClient'
import { unpackMiniblock, unpackStream } from './sign'
import { StreamStateView } from './streamStateView'
import { ParsedMiniblock, StreamTimelineEvent } from './types'
import { streamIdAsString, streamIdAsBytes } from './id'

const SCROLLBACK_MAX_COUNT = 20
export class UnauthenticatedClient {
    readonly rpcClient: StreamRpcClientType

    private readonly logCall: DLogger
    private readonly logEmitFromClient: DLogger
    private readonly logError: DLogger

    private readonly userId = 'unauthenticatedClientUser'
    private getScrollbackRequests: Map<string, ReturnType<typeof this.scrollback>> = new Map()

    constructor(rpcClient: StreamRpcClientType, logNamespaceFilter?: string) {
        if (logNamespaceFilter) {
            debug.enable(logNamespaceFilter)
        }

        this.rpcClient = rpcClient

        const shortId = 'unauthClientShortId'

        this.logCall = dlog('csb:cl:call').extend(shortId)
        this.logEmitFromClient = dlog('csb:cl:emit').extend(shortId)
        this.logError = dlogError('csb:cl:error').extend(shortId)

        this.logCall('new UnauthenticatedClient')
    }

    async getStream(streamId: string | Uint8Array): Promise<StreamStateView> {
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
            )
            const streamView = new StreamStateView(this.userId, streamIdAsString(streamId))

            streamView.initialize(
                streamAndCookie.nextSyncCookie,
                streamAndCookie.events,
                snapshot,
                streamAndCookie.miniblocks,
                [],
                prevSnapshotMiniblockNum,
                undefined,
                undefined,
            )
            return streamView
        } catch (err) {
            this.logCall('getStream', streamId, 'ERROR', err)
            throw err
        }
    }

    async scrollbackToDate(streamView: StreamStateView, toDate: number): Promise<void> {
        // scrollback to get events till max scrollback, toDate or till no events are left
        for (let i = 0; i < SCROLLBACK_MAX_COUNT; i++) {
            const result = await this.scrollback(streamView)
            if (result.terminus) {
                break
            }

            const currentOldestEvent = result.firstEvent
            if (currentOldestEvent) {
                if (!this.isWithin(currentOldestEvent.createdAtEpochMs, toDate)) {
                    break
                }
            }
        }
    }

    private async scrollback(
        streamView: StreamStateView,
    ): Promise<{ terminus: boolean; firstEvent?: StreamTimelineEvent }> {
        const currentRequest = this.getScrollbackRequests.get(streamView.streamId)
        if (currentRequest) {
            return currentRequest
        }

        const _scrollback = async (): Promise<{
            terminus: boolean
            firstEvent?: StreamTimelineEvent
        }> => {
            check(
                isDefined(streamView.miniblockInfo),
                `stream not initialized: ${streamView.streamId}`,
            )
            if (streamView.miniblockInfo.terminusReached) {
                this.logCall('scrollback', streamView.streamId, 'terminus reached')
                return { terminus: true, firstEvent: streamView.timeline.at(0) }
            }
            check(streamView.miniblockInfo.min >= streamView.prevSnapshotMiniblockNum)
            this.logCall('scrollback', {
                streamId: streamView.streamId,
                miniblockInfo: streamView.miniblockInfo,
                prevSnapshotMiniblockNum: streamView.prevSnapshotMiniblockNum,
            })
            const toExclusive = streamView.miniblockInfo.min
            const fromInclusive = streamView.prevSnapshotMiniblockNum
            const response = await this.getMiniblocks(
                streamView.streamId,
                fromInclusive,
                toExclusive,
            )

            // a race may occur here: if the state view has been reinitialized during the scrollback
            // request, we need to discard the new miniblocks.
            if ((streamView.miniblockInfo?.min ?? -1n) === toExclusive) {
                streamView.prependEvents(
                    response.miniblocks,
                    undefined,
                    response.terminus,
                    undefined,
                    undefined,
                )
                return { terminus: response.terminus, firstEvent: streamView.timeline.at(0) }
            }
            return { terminus: false, firstEvent: streamView.timeline.at(0) }
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
    ): Promise<{ miniblocks: ParsedMiniblock[]; terminus: boolean }> {
        if (toExclusive === fromInclusive) {
            return {
                miniblocks: [],
                terminus: toExclusive === 0n,
            }
        }

        const response = await this.rpcClient.getMiniblocks({
            streamId: streamIdAsBytes(streamId),
            fromInclusive,
            toExclusive,
        })

        const unpackedMiniblocks: ParsedMiniblock[] = []
        for (const miniblock of response.miniblocks) {
            const unpackedMiniblock = await unpackMiniblock(miniblock)
            unpackedMiniblocks.push(unpackedMiniblock)
        }
        return {
            terminus: response.terminus,
            miniblocks: unpackedMiniblocks,
        }
    }

    private isWithin(number: number | bigint, time: number) {
        const minEpochMs = Date.now() - time
        return number > minEpochMs
    }
}
