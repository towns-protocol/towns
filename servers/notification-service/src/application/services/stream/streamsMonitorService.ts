import { database } from '../../../infrastructure/database/prisma'
import { StreamKind } from '@prisma/client'
import {
    StreamRpcClient,
    errorContains,
    makeStreamRpcClient,
} from '../../../infrastructure/rpc/streamRpcClient'
import { isChannelStreamId, isDMChannelStreamId, isGDMChannelStreamId } from './id'
import { SyncedStreams, unpackStream } from './syncedStreams'
import { streamIdToBytes, userIdFromAddress } from './utils'
import { env } from '../../utils/environment'
import assert from 'assert'
import { Err } from '@river/proto'
import { logger } from '../../logger'

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
        logger.info('[StreamsMonitorService] adding DM', streamId, 'to db')

        this.validateStream(streamId, StreamKind.DM)

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
                logger.info('[StreamsMonitorService] new DM channel, storing user ids')
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
                    logger.info('[StreamsMonitorService] no inception in snapshot')
                    continue
                }
                inceptionFound = true
                logger.info('[StreamsMonitorService] new DM snapshot, storing user ids')

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
            logger.info('[StreamsMonitorService] no inception found for DM channel', streamId)
        }
    }

    public async addGDMStreamToDB(streamId: string): Promise<void> {
        logger.info('[StreamsMonitorService] adding gdm', streamId, 'to db')
        this.validateStream(streamId, StreamKind.GDM)

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

        const firstMiniblock = unpacked.miniblocks[0]

        const userIds = new Set<string>()

        for (const envelope of firstMiniblock.events) {
            if (
                envelope.event.payload.case === 'miniblockHeader' &&
                'snapshot' in envelope.event.payload.value
            ) {
                const { snapshot } = envelope.event.payload.value
                if (!snapshot?.members?.joined) {
                    return
                }
                for (const member of snapshot.members.joined) {
                    userIds.add(userIdFromAddress(member.userAddress))
                }
            }
        }

        logger.info('[StreamsMonitorService] new GDM channel, user ids', userIds)

        await database.syncedStream.create({
            data: {
                streamId,
                kind: StreamKind.GDM,
                syncCookie: response.stream?.nextSyncCookie?.toJsonString() || '',
                userIds: Array.from(userIds),
            },
        })
    }

    private async validateStream(streamId: string, kind: StreamKind): Promise<void> {
        let streamIsValid = false
        if (kind === StreamKind.DM) {
            streamIsValid = isDMChannelStreamId(streamId)
        } else if (kind === StreamKind.GDM) {
            streamIsValid = isGDMChannelStreamId(streamId)
        } else if (kind === StreamKind.Channel) {
            streamIsValid = isChannelStreamId(streamId)
        }

        assert(streamIsValid, `stream is not a ${kind} stream`)
        assert(
            (await database.syncedStream.count({
                where: { streamId },
            })) === 0,
            `stream already added to db`,
        )
    }

    public async startMonitoringStreams() {
        if (env.NOTIFICATION_SYNC_ENABLED === 'true') {
            logger.info('[StreamsMonitorService] notification sync is enabled')
            await this.refreshChannelStreams()
            const oneMinute = 1 * 60 * 1000
            this.intervalId = setInterval(async () => {
                await this.refreshChannelStreams()
            }, oneMinute)

            return this.streams.startSyncStreams()
        } else {
            logger.info('[StreamsMonitorService] notification sync is disabled')
            return new Promise<void>((resolve) => {
                this.releaseServiceAwait = () => {
                    this.releaseServiceAwait = undefined
                    resolve()
                }
            })
        }
    }

    private async refreshChannelStreams() {
        logger.info('[StreamsMonitorService] refreshChannelStreams')
        await this.fetchAndAddNewChannelStreams()
        await this.removeStaleStreams()
    }

    private async fetchAndAddNewChannelStreams() {
        const streamsMetadata = await this.getNewStreamsToMonitor()
        const notFoundStreams = new Set<string>()

        streamsMetadata.DM.streamIds.forEach(async (streamId) => {
            try {
                logger.info('[StreamsMonitorService] new dm stream', streamId)
                await this.addDMSyncStreamToDB(streamId)
            } catch (error) {
                if (errorContains(error, Err.NOT_FOUND)) {
                    logger.info(`[StreamsMonitorService] DM ${streamId} stream not found`)
                    notFoundStreams.add(streamId)
                    return
                }
                logger.error(
                    `[StreamsMonitorService] Failed to add DM ${streamId} stream to db. Error: ${error}`,
                )
            }
        })
        streamsMetadata.GDM.streamIds.forEach(async (streamId) => {
            try {
                await this.addGDMStreamToDB(streamId)
            } catch (error) {
                if (errorContains(error, Err.NOT_FOUND)) {
                    logger.info(`[StreamsMonitorService] GDM ${streamId} stream not found`)
                    notFoundStreams.add(streamId)
                    return
                }
                logger.error(
                    `[StreamsMonitorService] Failed to add GDM ${streamId} stream to db. Error: ${error}`,
                )
            }
        })
        // streamsMetadata.Channel.streamIds.forEach(async (streamId) => {
        // logger.info('[StreamsMonitorService] new channel stream', streamId)
        // })

        if (notFoundStreams.size > 0) {
            logger.info('[StreamsMonitorService] deleting the not found streams', notFoundStreams)
            await database.userSettingsChannel.deleteMany({
                where: {
                    ChannelId: {
                        in: Array.from(notFoundStreams),
                    },
                },
            })
        }
    }

    private async removeStaleStreams() {
        const channelIds = (
            await database.userSettingsChannel.findMany({
                select: { ChannelId: true },
            })
        ).map((s) => s.ChannelId)
        const staleStreams = (
            await database.syncedStream.findMany({
                select: { streamId: true },
                where: {
                    NOT: {
                        streamId: {
                            in: channelIds,
                        },
                    },
                },
            })
        ).map((s) => s.streamId)

        if (staleStreams.length > 0) {
            logger.info('[StreamsMonitorService] removeStaleStreams', staleStreams)
            await database.syncedStream.deleteMany({
                where: {
                    streamId: {
                        in: staleStreams,
                    },
                },
            })
        }
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
