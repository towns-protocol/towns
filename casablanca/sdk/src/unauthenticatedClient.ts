import debug from 'debug'
import EventEmitter from 'events'
import TypedEmitter from 'typed-emitter'
import { check, hasElements, isDefined } from './check'
import { DLogger, dlog } from './dlog'
import { RiverEventsV2 } from './eventV2'
import { StreamRpcClientType } from './makeStreamRpcClient'
import { unpackStreamResponse } from './sign'
import { StreamEvents } from './streamEvents'
import { StreamStateView } from './streamStateView'

export type EmittedEvents = StreamEvents & RiverEventsV2

export class UnauthenticatedClient extends (EventEmitter as new () => TypedEmitter<EmittedEvents>) {
    readonly rpcClient: StreamRpcClientType

    private readonly logCall: DLogger
    private readonly logEmitFromClient: DLogger

    private readonly userId = 'unauthenticatedClientUser'

    constructor(rpcClient: StreamRpcClientType, logNamespaceFilter?: string) {
        super()
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
            const { streamAndCookie, snapshot, miniblocks } = unpackStreamResponse(response)
            const streamView = new StreamStateView(this.userId, streamId, snapshot)
            streamView.initialize(streamAndCookie, snapshot, miniblocks, undefined)
            return streamView
        } catch (err) {
            this.logCall('getStream', streamId, 'ERROR', err)
            throw err
        }
    }

    emit<E extends keyof EmittedEvents>(event: E, ...args: Parameters<EmittedEvents[E]>): boolean {
        this.logEmitFromClient(event, ...args)
        return super.emit(event, ...args)
    }
}
