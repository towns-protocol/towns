import { database } from '../../../infrastructure/database/prisma'
import { StreamKind } from '@prisma/client'
import { StreamRpcClient, makeStreamRpcClient } from '../../../infrastructure/rpc/streamRpcClient'
import { isChannelStreamId, isDMChannelStreamId, isGDMChannelStreamId } from './id'
import { SyncedStreams, unpackStream } from './syncedStreams'
import { streamIdToBytes, userIdFromAddress } from './utils'
import { env } from '../../utils/environment'

type StreamsMetadata = {
    [key in StreamKind]: {
        streamIds: Set<string>
    }
}

export class StreamsMonitorService {
    private rpcClient: StreamRpcClient = makeStreamRpcClient()
    private streams: SyncedStreams = new SyncedStreams(this.rpcClient)
    private intervalId: NodeJS.Timeout | null = null
    private releaseServiceAwait: (() => void) | undefined

    private async getNewStreamsToMonitor(): Promise<StreamsMetadata> {
        const streamIds = (
            await database.syncedStream.findMany({
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

        const streamInfo: StreamsMetadata = {
            [StreamKind.DM]: { streamIds: new Set() },
            [StreamKind.GDM]: { streamIds: new Set() },
            [StreamKind.Channel]: { streamIds: new Set() },
        }
        for (const { ChannelId } of channelIds) {
            const streamKind = this.getStreamKind(ChannelId)
            if (!streamKind) {
                continue
            }
            streamInfo[streamKind].streamIds.add(ChannelId)
        }

        // console.log('[StreamsMonitorService] getNewChannelIdsToMonitor', streamInfo)
        return streamInfo
    }

    private getStreamKind(ChannelId: string) {
        if (isDMChannelStreamId(ChannelId)) {
            return StreamKind.DM
        } else if (isGDMChannelStreamId(ChannelId)) {
            return StreamKind.GDM
        } else if (isChannelStreamId(ChannelId)) {
            return StreamKind.Channel
        }
        return ''
    }

    public async addDMSyncStreamToDB(streamId: string): Promise<void> {
        if (!isDMChannelStreamId(streamId)) {
            console.log('[StreamsMonitorService] stream is not a dm channel', streamId)
            return
        }
        if (
            await database.syncedStream.findUnique({
                where: { streamId },
            })
        ) {
            console.log('[StreamsMonitorService] stream already added to db', streamId)
            return
        }

        console.log('[StreamsMonitorService] adding dm', streamId, 'to db')
        const response = await this.rpcClient.getStream({
            streamId: streamIdToBytes(streamId),
            optional: false,
        })
        const unpacked = await unpackStream(response.stream)

        if (response.stream) {
            this.streams.set(streamId, response.stream!)
            this.streams.addStreamToSync(response.stream.nextSyncCookie!)
        }

        if (unpacked.miniblocks.length === 0) {
            return
        }

        let inceptionFound = false
        const firstMiniblock = unpacked.miniblocks[0]

        for (const envelope of firstMiniblock.events) {
            const { payload } = envelope.event
            if (payload.case === 'dmChannelPayload' && payload.value.content.case === 'inception') {
                console.log('[StreamsMonitorService] new dm channel, storing user ids')
                inceptionFound = true

                const { firstPartyAddress, secondPartyAddress } = payload.value.content.value
                await database.syncedStream.create({
                    data: {
                        streamId,
                        userIds: [
                            userIdFromAddress(firstPartyAddress),
                            userIdFromAddress(secondPartyAddress),
                        ],
                        kind: StreamKind.DM,
                        syncCookie: response.stream?.nextSyncCookie?.toJsonString() || '',
                    },
                })
            } else if (
                payload.case === 'miniblockHeader' &&
                'snapshot' in payload.value &&
                payload.value.snapshot?.content.case === 'dmChannelContent'
            ) {
                const inception = payload.value.snapshot.content.value.inception
                if (!inception) {
                    console.log('[StreamsMonitorService] no inception in snapshot')
                    continue
                }
                inceptionFound = true
                console.log('[StreamsMonitorService] new dm snapshot, storing user ids')

                const { firstPartyAddress, secondPartyAddress } = inception
                await database.syncedStream.create({
                    data: {
                        streamId,
                        userIds: [
                            userIdFromAddress(firstPartyAddress),
                            userIdFromAddress(secondPartyAddress),
                        ],
                        kind: StreamKind.DM,
                        syncCookie: response.stream?.nextSyncCookie?.toJsonString() || '',
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
        if (env.NOTIFICATION_SYNC_ENABLED === 'true') {
            console.log('notification sync is enabled')
            await this.fetchAndAddNewChannelStreams()
            const oneMinute = 1 * 60 * 1000
            this.intervalId = setInterval(async () => {
                await this.fetchAndAddNewChannelStreams()
            }, oneMinute)

            return this.streams.startSyncStreams()
        } else {
            console.log('notification sync is disabled')
            return new Promise<void>((resolve) => {
                this.releaseServiceAwait = () => {
                    this.releaseServiceAwait = undefined
                    resolve()
                }
            })
        }
    }

    private async fetchAndAddNewChannelStreams() {
        console.log('[StreamsMonitorService] fetchAndAddNewChannelStreams')
        const streamsMetadata = await this.getNewStreamsToMonitor()

        streamsMetadata.DM.streamIds.forEach(async (streamId) => {
            try {
                await this.addDMSyncStreamToDB(streamId)
            } catch (error) {
                console.error('Failed to add dm sync stream to db', streamId, error)
            }
        })
        streamsMetadata.GDM.streamIds.forEach(async (streamId) => {
            console.log('[StreamsMonitorService] new gdm stream', streamId)
        })
        streamsMetadata.Channel.streamIds.forEach(async (streamId) => {
            console.log('[StreamsMonitorService] new channel stream', streamId)
        })
    }

    public async stopMonitoringStreams() {
        if (env.NOTIFICATION_SYNC_ENABLED === 'true') {
            if (this.intervalId) {
                clearInterval(this.intervalId!)
            }
            return this.streams.stopSync()
        } else {
            this.releaseServiceAwait?.()
        }
    }
}
