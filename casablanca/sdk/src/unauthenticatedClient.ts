import debug from 'debug'
import { DLogger, check, dlog, hasElements, isDefined } from '@river/mecholm'
import { StreamRpcClientType } from './makeStreamRpcClient'
import { unpackStreamResponse } from './sign'
import { StreamStateView } from './streamStateView'

export class UnauthenticatedClient {
    readonly rpcClient: StreamRpcClientType

    private readonly logCall: DLogger
    private readonly logEmitFromClient: DLogger

    private readonly userId = 'unauthenticatedClientUser'

    constructor(rpcClient: StreamRpcClientType, logNamespaceFilter?: string) {
        if (logNamespaceFilter) {
            debug.enable(logNamespaceFilter)
        }

        this.rpcClient = rpcClient

        const shortId = 'unauthClientShortId'

        this.logCall = dlog('csb:cl:call').extend(shortId)
        this.logEmitFromClient = dlog('csb:cl:emit').extend(shortId)

        this.logCall('new UnauthenticatedClient')
    }

    async getStream(streamId: string): Promise<StreamStateView> {
        try {
            this.logCall('getStream', streamId)
            const response = await this.rpcClient.getStream({ streamId })
            this.logCall('getStream', response.stream)
            check(isDefined(response.stream) && hasElements(response.miniblocks), 'got bad stream')
            const { streamAndCookie, snapshot, miniblocks, prevSnapshotMiniblockNum } =
                unpackStreamResponse(response)
            const streamView = new StreamStateView(
                this.userId,
                streamId,
                snapshot,
                prevSnapshotMiniblockNum,
            )

            streamView.initialize(streamAndCookie, snapshot, miniblocks, undefined, undefined)
            return streamView
        } catch (err) {
            this.logCall('getStream', streamId, 'ERROR', err)
            throw err
        }
    }
}
