import { DLogger, dlog } from '@river-build/dlog'
import { makeUserStreamId, streamIdAsBytes, userIdFromAddress } from '../../id'
import { RiverConnection } from '../river-connection/riverConnection'

export class StreamsClient {
    private riverConnection: RiverConnection
    private readonly logCall: DLogger

    constructor(riverConnection: RiverConnection) {
        this.riverConnection = riverConnection
        this.logCall = dlog('csb:sc:call')
    }

    async start() {
        return Promise.resolve()
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
        const response = await this.riverConnection.call((rpcClient) =>
            rpcClient.getStream({
                streamId: streamIdAsBytes(streamId),
                optional: true,
            }),
        )
        this.logCall('streamExists=', streamId, response.stream)
        return response.stream !== undefined
    }
}
