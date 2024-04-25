import { Err, MemberPayload_Membership, MembershipOp, MiniblockHeader } from '@river-build/proto'
import { StreamRpcClient, errorContains, makeStreamRpcClient } from './streamRpcClient'
import { SyncedStreams, unpackStream } from './syncedStreams'
import { isChannelStreamId, isDMChannelStreamId, isGDMChannelStreamId } from './id'
import { streamIdFromBytes, streamIdToBytes, userIdFromAddress } from './utils'

import { IStreamsMonitorService as IStreamsMonitorService } from '../../../serviceLoader'
import { ParsedStreamAndCookie } from './types'
import { StreamKind } from '@prisma/client'
import assert from 'assert'
import { createLogger } from '../logger'
import { database } from '../../prisma'
import { env } from '../../utils/environment'

const logger = createLogger('streamsMonitorService')

type StreamsMetadata = {
    [key in StreamKind]: {
        streamIds: Set<string>
    }
}

export class StreamsMonitorService implements IStreamsMonitorService {
    private rpcClient: StreamRpcClient = makeStreamRpcClient()
    private streams: SyncedStreams = new SyncedStreams(this.rpcClient)
    private intervalId: NodeJS.Timeout | null = null
    private releaseServiceAwait: (() => void) | undefined
    private lastestStreamIdsProcessed: Set<string> = new Set()

    private static _instance: StreamsMonitorService | undefined = undefined
    public static get instance(): StreamsMonitorService {
        if (!StreamsMonitorService._instance) {
            StreamsMonitorService._instance = new StreamsMonitorService()
        }
        return StreamsMonitorService._instance
    }

    private async getNewStreamsToMonitor(): Promise<StreamsMetadata> {
        const streamIds = (
            await database.syncedStream.findMany({
                select: { StreamId: true },
            })
        ).map((s) => s.StreamId)
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

    private getStreamKind(channelId: string) {
        if (isDMChannelStreamId(channelId)) {
            return StreamKind.DM
        } else if (isGDMChannelStreamId(channelId)) {
            return StreamKind.GDM
        } else if (isChannelStreamId(channelId)) {
            return StreamKind.Channel
        }
        return ''
    }

    private async addDMSyncStreamToDB(streamId: string): Promise<Set<string>> {
        const currentMembers = new Set<string>()
        logger.info(`adding DM ${streamId} to db`, { streamId })

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
            return currentMembers
        }

        let inceptionFound = false
        const firstMiniblock = unpacked.miniblocks[0]

        for (const envelope of firstMiniblock.events) {
            const { payload } = envelope.event
            if (payload.case === 'dmChannelPayload' && payload.value.content.case === 'inception') {
                logger.info('new DM channel, storing user ids')
                inceptionFound = true

                const { firstPartyAddress, secondPartyAddress } = payload.value.content.value
                if (firstPartyAddress) {
                    currentMembers.add(userIdFromAddress(firstPartyAddress))
                }
                if (secondPartyAddress) {
                    currentMembers.add(userIdFromAddress(secondPartyAddress))
                }
                await database.syncedStream.create({
                    data: {
                        StreamId: streamId,
                        UserIds: Array.from(currentMembers),
                        Kind: StreamKind.DM,
                        SyncCookie: response.stream?.nextSyncCookie?.toJsonString() || '',
                    },
                })
            } else if (
                payload.case === 'miniblockHeader' &&
                'snapshot' in payload.value &&
                payload.value.snapshot?.content.case === 'dmChannelContent'
            ) {
                const inception = payload.value.snapshot.content.value.inception
                if (!inception) {
                    logger.info('no inception in snapshot')
                    continue
                }
                inceptionFound = true
                logger.info('new DM snapshot, storing user ids')

                const { firstPartyAddress, secondPartyAddress } = inception
                if (firstPartyAddress) {
                    currentMembers.add(userIdFromAddress(firstPartyAddress))
                }
                if (secondPartyAddress) {
                    currentMembers.add(userIdFromAddress(secondPartyAddress))
                }
                await database.syncedStream.create({
                    data: {
                        StreamId: streamId,
                        UserIds: Array.from(currentMembers),
                        Kind: StreamKind.DM,
                        SyncCookie: response.stream?.nextSyncCookie?.toJsonString() || '',
                    },
                })
            }

            if (inceptionFound) {
                break
            }
        }

        if (!inceptionFound) {
            logger.error('no inception found for DM channel', { streamId })
        }
        return currentMembers
    }

    private async addGDMStreamToDB(streamId: string): Promise<Set<string>> {
        logger.info(`adding gdm ${streamId} to db`, { streamId })
        this.validateStream(streamId, StreamKind.GDM)
        const unpacked = await this.getAndParseStream(streamId)
        const currentMembers = this.getUserIdsFromChannelOrGDMStreams(unpacked)
        await database.syncedStream.create({
            data: {
                StreamId: streamId,
                Kind: StreamKind.GDM,
                SyncCookie: unpacked?.nextSyncCookie?.toJsonString() || '',
                UserIds: Array.from(currentMembers),
            },
        })
        return currentMembers
    }

    private async addChannelStreamToDB(streamId: string): Promise<Set<string>> {
        logger.info(`adding channel ${streamId} to db`, { streamId })
        this.validateStream(streamId, StreamKind.Channel)
        const unpacked = await this.getAndParseStream(streamId)
        const currentMembers = this.getUserIdsFromChannelOrGDMStreams(unpacked)
        await database.syncedStream.create({
            data: {
                StreamId: streamId,
                Kind: StreamKind.Channel,
                SyncCookie: unpacked?.nextSyncCookie?.toJsonString() || '',
                UserIds: Array.from(currentMembers),
            },
        })
        return currentMembers
    }

    private async removeNonMembersFromChannelSettings(
        streamId: string,
        currentMembers: Set<string>,
    ) {
        const nonMembers = await database.userSettingsChannel.findMany({
            where: {
                ChannelId: streamId,
                UserId: {
                    notIn: Array.from(currentMembers),
                },
            },
        })
        if (nonMembers.length > 0) {
            logger.info('removing non-members from channel settings', {
                streamId,
                nonMembers,
            })
            await database.userSettingsChannel.deleteMany({
                where: {
                    ChannelId: streamId,
                    UserId: {
                        notIn: Array.from(currentMembers),
                    },
                },
            })
        }
    }

    private getUserIdsFromChannelOrGDMStreams(unpacked: ParsedStreamAndCookie): Set<string> {
        const currentMembers = new Set<string>()
        for (const miniblock of unpacked.miniblocks) {
            for (const envelope of miniblock.events) {
                const isMembershipUpdate =
                    envelope.event.payload.case === 'memberPayload' &&
                    envelope.event.payload.value.content.case === 'membership'
                const isSnapshot =
                    envelope.event.payload.case === 'miniblockHeader' &&
                    'snapshot' in envelope.event.payload.value &&
                    envelope.event.payload.value.snapshot !== undefined

                if (isMembershipUpdate) {
                    const value = envelope.event.payload.value!.content
                        .value as MemberPayload_Membership
                    const { op } = value
                    if (op === MembershipOp.SO_JOIN) {
                        const userAddress = userIdFromAddress(value.userAddress)
                        logger.info(
                            `stream ${streamIdFromBytes(
                                unpacked.nextSyncCookie.streamId,
                            )} membership update SO_JOIN for user ${userAddress}`,
                            {
                                streamId: streamIdFromBytes(unpacked.nextSyncCookie.streamId),
                                userAddress,
                            },
                        )
                        if (!currentMembers.has(userAddress)) {
                            currentMembers.add(userAddress)
                        }
                    }
                    if (op === MembershipOp.SO_LEAVE) {
                        const userAddress = userIdFromAddress(value.userAddress)
                        logger.info(
                            `stream ${streamIdFromBytes(
                                unpacked.nextSyncCookie.streamId,
                            )} membership update SO_LEAVE for user ${userAddress}`,
                            {
                                streamId: streamIdFromBytes(unpacked.nextSyncCookie.streamId),
                                userAddress,
                            },
                        )
                        if (currentMembers.has(userAddress)) {
                            currentMembers.delete(userAddress)
                        }
                    }
                } else if (isSnapshot) {
                    const snapshot = (envelope.event.payload.value as MiniblockHeader).snapshot
                    if (!snapshot?.members?.joined) {
                        continue
                    }
                    for (const member of snapshot.members.joined) {
                        currentMembers.add(userIdFromAddress(member.userAddress))
                    }
                }
            }
        }
        return currentMembers
    }

    private async getAndParseStream(streamId: string): Promise<ParsedStreamAndCookie> {
        const response = await this.rpcClient.getStream({
            streamId: streamIdToBytes(streamId),
            optional: false,
        })
        const unpacked = await unpackStream(response.stream)

        if (response.stream) {
            this.streams.set(streamId, response.stream!)
            this.streams.addStreamToSync(response.stream.nextSyncCookie!)
        }

        assert(unpacked.miniblocks.length > 0, 'no miniblocks in stream')

        return unpacked
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
                where: { StreamId: streamId },
            })) === 0,
            `stream already added to db`,
        )
    }

    public async startMonitoringStreams() {
        if (env.NOTIFICATION_SYNC_ENABLED === 'true') {
            logger.info('notification sync is enabled')
            await this.refreshChannelStreams()
            const tenMinutes = 10 * 60 * 1000
            this.intervalId = setInterval(async () => {
                await this.refreshChannelStreams()
            }, tenMinutes)

            return this.streams.startSyncStreams()
        } else {
            logger.info('notification sync is disabled')
            return new Promise<void>((resolve) => {
                this.releaseServiceAwait = () => {
                    this.releaseServiceAwait = undefined
                    resolve()
                }
            })
        }
    }

    private async refreshChannelStreams() {
        logger.info('refreshChannelStreams')
        await this.fetchAndAddNewChannelStreams()
        await this.removeStaleStreams()
    }

    public async addNewStreamsToDB(streamIds: Set<string>) {
        let newStreamIds = this.findUnprocessedStreams(streamIds)
        if (newStreamIds.size === 0) {
            // logger.info('all new streams already processed')
            return
        }

        logger.info('addStreamsToDB', { newStreamIds: Array.from(newStreamIds) })
        const streamsMetadata: StreamsMetadata = {
            [StreamKind.DM]: { streamIds: new Set() },
            [StreamKind.GDM]: { streamIds: new Set() },
            [StreamKind.Channel]: { streamIds: new Set() },
        }

        const streamsAlreadyInDB = (
            await database.syncedStream.findMany({
                where: {
                    StreamId: {
                        in: Array.from(newStreamIds),
                    },
                },
                select: {
                    StreamId: true,
                },
            })
        ).map((s) => s.StreamId)

        newStreamIds = new Set([...newStreamIds].filter((s) => !streamsAlreadyInDB.includes(s)))

        for (const streamId of newStreamIds) {
            const streamKind = this.getStreamKind(streamId)
            if (!streamKind) {
                continue
            }
            streamsMetadata[streamKind].streamIds.add(streamId)
        }

        if (newStreamIds.size > 0) {
            return this.processStreamsMetadata(streamsMetadata)
        }
    }

    private findUnprocessedStreams(streamIds: Set<string>): Set<string> {
        const newStreamIds = new Set(
            [...streamIds].filter((s) => !this.lastestStreamIdsProcessed.has(s)),
        )
        if (newStreamIds.size > 0) {
            this.lastestStreamIdsProcessed = new Set([
                ...this.lastestStreamIdsProcessed,
                ...streamIds,
            ])
            // keep 100 latest stream ids processed
            if (this.lastestStreamIdsProcessed.size > 100) {
                const streamIdsArray = Array.from(this.lastestStreamIdsProcessed).slice(-100)
                this.lastestStreamIdsProcessed = new Set(streamIdsArray)
            }
        }
        return newStreamIds
    }

    private async processStreamsMetadata(streamsMetadata: StreamsMetadata) {
        const notFoundStreams = new Set<string>()
        const addPromises: Promise<void>[] = []

        for (const streamId of streamsMetadata.DM.streamIds) {
            const p = async () => {
                try {
                    logger.info(`new dm stream ${streamId}`, { streamId })
                    const currentMembers = await this.addDMSyncStreamToDB(streamId)
                    await this.removeNonMembersFromChannelSettings(streamId, currentMembers)
                } catch (error) {
                    if (errorContains(error, Err.NOT_FOUND)) {
                        logger.info(`DM ${streamId} stream not found`)
                        notFoundStreams.add(streamId)
                        return
                    }
                    logger.error(`Failed to add DM ${streamId} stream to db`, { error })
                }
            }
            addPromises.push(p())
        }
        for (const streamId of streamsMetadata.GDM.streamIds) {
            const p = async () => {
                try {
                    const currentMembers = await this.addGDMStreamToDB(streamId)
                    await this.removeNonMembersFromChannelSettings(streamId, currentMembers)
                } catch (error) {
                    if (errorContains(error, Err.NOT_FOUND)) {
                        logger.info(`GDM ${streamId} stream not found`)
                        notFoundStreams.add(streamId)
                        return
                    }
                    logger.error(`Failed to add GDM ${streamId} stream to db`, { error })
                }
            }
            addPromises.push(p())
        }
        for (const streamId of streamsMetadata.Channel.streamIds) {
            const p = async () => {
                try {
                    const currentMembers = await this.addChannelStreamToDB(streamId)
                    await this.removeNonMembersFromChannelSettings(streamId, currentMembers)
                } catch (error) {
                    if (errorContains(error, Err.NOT_FOUND)) {
                        logger.info(`Channel ${streamId} stream not found`)
                        notFoundStreams.add(streamId)
                        return
                    }
                    logger.error(`Failed to add GDM ${streamId} stream to db`, { error })
                }
            }
            addPromises.push(p())
        }

        await Promise.all(addPromises)

        if (notFoundStreams.size > 0) {
            logger.info(`deleting ${notFoundStreams.size} not found streams`, {
                notFoundStreams: Array.from(notFoundStreams),
            })
            await database.userSettingsChannel.deleteMany({
                where: {
                    ChannelId: {
                        in: Array.from(notFoundStreams),
                    },
                },
            })
        }
    }

    private async fetchAndAddNewChannelStreams() {
        const streamsMetadata = await this.getNewStreamsToMonitor()
        return this.processStreamsMetadata(streamsMetadata)
    }

    private async removeStaleStreams(): Promise<void> {
        const channelIds = (
            await database.userSettingsChannel.findMany({
                select: { ChannelId: true },
                distinct: ['ChannelId'],
            })
        ).map((s) => s.ChannelId)

        const staleStreams = (
            await database.syncedStream.findMany({
                select: { StreamId: true },
                where: {
                    NOT: {
                        StreamId: {
                            in: channelIds,
                        },
                    },
                },
            })
        ).map((s) => s.StreamId)

        if (staleStreams.length > 0) {
            logger.info('deleting stale streams from database', {
                staleStreams,
            })
            await database.syncedStream.deleteMany({
                where: {
                    StreamId: {
                        in: staleStreams,
                    },
                },
            })

            logger.info('removing stale streams from sync', { staleStreams })
            const removePromises: Promise<void>[] = []
            staleStreams.forEach((streamId) => {
                removePromises.push(this.streams.removeStreamFromSync(streamId))
            })
            const allSettled = await Promise.allSettled(removePromises)
            allSettled.forEach((p, i) => {
                if (p.status === 'rejected') {
                    logger.error('failed to remove stream from sync', {
                        streamId: staleStreams[i],
                        error: p.reason,
                    })
                }
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
