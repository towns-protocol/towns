import { database } from '../../../infrastructure/database/prisma'
import { StreamRpcClient, makeStreamRpcClient } from '../../../infrastructure/rpc/streamRpcClient'
import { isDMChannelStreamId } from './id'
import { SyncedStreams, unpackStream } from './syncedStreams'
import { streamIdToBytes, userIdFromAddress } from './utils'

export class StreamsMonitorService {
    private rpcClient: StreamRpcClient = makeStreamRpcClient()
    private streams: SyncedStreams = new SyncedStreams(this.rpcClient)
    private intervalId: NodeJS.Timeout | null = null

    private async getNewChannelIdsToMonitor() {
        const streamIds = (
            await database.dMStream.findMany({
                select: { streamId: true },
            })
        ).map((s) => s.streamId)
        const channelIds = await database.userSettingsChannel.findMany({
            select: { ChannelId: true },
            where: {
                ChannelId: {
                    notIn: streamIds,
                },
            },
            distinct: ['ChannelId'],
        })
        console.log('channelIds', channelIds)
        return channelIds.map((c) => c.ChannelId)
    }

    public async addDMStreamToDB(streamId: string): Promise<void> {
        if (!isDMChannelStreamId(streamId)) {
            console.log('stream is not a dm channel', streamId)
            return
        }
        if (
            await database.dMStream.findUnique({
                where: { streamId },
            })
        ) {
            console.log('stream already added to db', streamId)
            return
        }

        const response = await this.rpcClient.getStream({
            streamId: streamIdToBytes(streamId),
            optional: false,
        })
        const unpacked = await unpackStream(response.stream)

        if (response.stream) {
            this.streams.set(streamId, response.stream!)
        }

        if (unpacked.miniblocks.length === 0) {
            return
        }

        let inceptionFound = false
        const firstMiniblock = unpacked.miniblocks[0]

        for (const envelope of firstMiniblock.events) {
            const { payload } = envelope.event
            if (payload.case === 'dmChannelPayload' && payload.value.content.case === 'inception') {
                console.log('new dm channel, storing user ids')
                inceptionFound = true

                const { firstPartyAddress, secondPartyAddress } = payload.value.content.value
                await database.dMStream.create({
                    data: {
                        streamId,
                        firstUserId: userIdFromAddress(firstPartyAddress),
                        secondUserId: userIdFromAddress(secondPartyAddress),
                    },
                })
            } else if (
                payload.case === 'miniblockHeader' &&
                'snapshot' in payload.value &&
                payload.value.snapshot?.content.case === 'dmChannelContent'
            ) {
                const inception = payload.value.snapshot.content.value.inception
                if (!inception) {
                    console.log('no inception in snapshot')
                    continue
                }
                inceptionFound = true
                console.log('new dm snapshot, storing user ids')

                const { firstPartyAddress, secondPartyAddress } = inception
                await database.dMStream.create({
                    data: {
                        streamId,
                        firstUserId: userIdFromAddress(firstPartyAddress),
                        secondUserId: userIdFromAddress(secondPartyAddress),
                    },
                })
            }

            if (inceptionFound) {
                break
            }
        }

        if (!inceptionFound) {
            console.log('no inception found for dm channel', streamId)
        }
    }

    public async startMonitoringStreams() {
        console.log('startMonitoringStreams: Starting to monitor streams')
        for (const channelId of await this.getNewChannelIdsToMonitor()) {
            await this.addDMStreamToDB(channelId)
        }
        const oneMinute = 1 * 60 * 1000
        this.intervalId = setInterval(async () => {
            console.log('startMonitoringStreams: Checking for new channels to monitor')
            for (const channelId of await this.getNewChannelIdsToMonitor()) {
                await this.addDMStreamToDB(channelId)
            }
        }, oneMinute)
        return this.streams.startSyncStreams()
    }

    public async stopMonitoringStreams() {
        if (this.intervalId) {
            clearInterval(this.intervalId!)
        }
        return this.streams.stopSync()
    }
}
