import { check, dlogger } from '@river-build/dlog'
import { isDefined } from '../../../check'
import {
    isChannelStreamId,
    makeDefaultChannelStreamId,
    makeUniqueChannelStreamId,
} from '../../../id'
import { PersistedObservable, persistedObservable } from '../../../observable/persistedObservable'
import { Identifiable, LoadPriority, Store } from '../../../store/store'
import { RiverConnection } from '../../river-connection/riverConnection'
import { Channel } from './channel'
import { ethers } from 'ethers'
import { SpaceDapp, SpaceInfo } from '@river-build/web3'
import { Members } from '../../members/members'

const logger = dlogger('csb:space')

export interface SpaceModel extends Identifiable {
    /** The River `spaceId` of the space. */
    id: string
    /** Whether the SyncAgent has loaded this space data. */
    initialized: boolean
    /** The ids of the channels in the space. */
    channelIds: string[]
    /** The space metadata {@link SpaceInfo}. */
    metadata?: SpaceInfo
}

@persistedObservable({ tableName: 'space' })
export class Space extends PersistedObservable<SpaceModel> {
    private channels: Record<string, Channel>
    members: Members
    constructor(
        id: string,
        private riverConnection: RiverConnection,
        store: Store,
        private spaceDapp: SpaceDapp,
    ) {
        super({ id, channelIds: [], initialized: false }, store, LoadPriority.high)
        this.channels = {
            [makeDefaultChannelStreamId(id)]: new Channel(
                makeDefaultChannelStreamId(id),
                id,
                riverConnection,
                spaceDapp,
                store,
            ),
        }
        this.members = new Members(id, riverConnection, store)
    }

    protected override onLoaded() {
        this.riverConnection.registerView((client) => {
            if (
                client.streams.has(this.data.id) &&
                client.streams.get(this.data.id)?.view.isInitialized
            ) {
                this.onStreamInitialized(this.data.id)
            }
            client.on('streamInitialized', this.onStreamInitialized)
            client.on('spaceChannelCreated', this.onSpaceChannelCreated)
            client.on('spaceChannelDeleted', this.onSpaceChannelDeleted)
            client.on('spaceChannelUpdated', this.onSpaceChannelUpdated)
            return () => {
                client.off('streamInitialized', this.onStreamInitialized)
                client.off('spaceChannelCreated', this.onSpaceChannelCreated)
                client.off('spaceChannelDeleted', this.onSpaceChannelDeleted)
                client.off('spaceChannelUpdated', this.onSpaceChannelUpdated)
            }
        })
        if (!this.data.metadata) {
            // todo aellis this needs retries and batching
            this.spaceDapp
                .getSpaceInfo(this.data.id)
                .then((spaceInfo) => {
                    this.setData({ metadata: spaceInfo })
                })
                .catch((error) => {
                    logger.error('getSpaceInfo error', error)
                })
        }
    }

    /** Joins the space.
     * @param signer - The signer to use to join the space.
     * @param opts - Additional options for the join.
     */
    async join(signer: ethers.Signer, opts?: { skipMintMembership?: boolean }) {
        const spaceId = this.data.id
        if (opts?.skipMintMembership !== true) {
            const { issued } = await this.spaceDapp.joinSpace(
                spaceId,
                this.riverConnection.userId,
                signer,
            )
            logger.log('joinSpace transaction', issued)
        }
        await this.riverConnection.login({ spaceId })
        await this.riverConnection.call(async (client) => {
            await client.joinStream(spaceId)
            await client.joinStream(makeDefaultChannelStreamId(spaceId))
        })
    }

    /** Creates a channel in the space.
     * @param channelName - The name of the channel.
     * @param signer - The signer to use to create the channel.
     * @param opts - Additional options for the channel creation.
     * @returns The `channelId` of the created channel.
     */
    async createChannel(
        channelName: string,
        signer: ethers.Signer,
        opts?: {
            /** The topic of the channel. */
            topic?: string
        },
    ) {
        const spaceId = this.data.id
        const channelId = makeUniqueChannelStreamId(spaceId)
        const roles = await this.spaceDapp.getRoles(spaceId)
        const tx = await this.spaceDapp.createChannel(
            spaceId,
            channelName,
            '',
            channelId,
            roles.filter((role) => role.name !== 'Owner').map((role) => role.roleId),
            signer,
        )
        const receipt = await tx.wait()
        logger.log('createChannel receipt', receipt)
        await this.riverConnection.call((client) =>
            client.createChannel(spaceId, channelName, opts?.topic ?? '', channelId),
        )
        return channelId
    }

    /** Gets a channel by its id.
     * @param channelId - The `channelId` of the channel.
     * @returns The {@link Channel} model.
     */
    getChannel(channelId: string): Channel {
        check(isChannelStreamId(channelId), 'channelId is not a channel stream id')
        if (!this.channels[channelId]) {
            this.channels[channelId] = new Channel(
                channelId,
                this.data.id,
                this.riverConnection,
                this.spaceDapp,
                this.store,
            )
        }
        return this.channels[channelId]
    }

    /** Gets the default channel in the space.
     * Every space has a default channel.
     * @returns The {@link Channel} model.
     */
    getDefaultChannel(): Channel {
        return this.channels[makeDefaultChannelStreamId(this.data.id)]
    }

    private onStreamInitialized = (streamId: string) => {
        if (this.data.id === streamId) {
            const stream = this.riverConnection.client?.stream(streamId)
            check(isDefined(stream), 'stream is not defined')
            const channelIds = [...stream.view.spaceContent.spaceChannelsMetadata.keys()]
            for (const channelId of channelIds) {
                if (!this.channels[channelId]) {
                    this.channels[channelId] = new Channel(
                        channelId,
                        this.data.id,
                        this.riverConnection,
                        this.spaceDapp,
                        this.store,
                    )
                }
            }
            this.setData({ initialized: true, channelIds: channelIds })
        }
    }

    private onSpaceChannelCreated = (streamId: string, channelId: string) => {
        if (streamId === this.data.id) {
            if (!this.channels[channelId]) {
                this.channels[channelId] = new Channel(
                    channelId,
                    this.data.id,
                    this.riverConnection,
                    this.spaceDapp,
                    this.store,
                )
            }
            if (!this.data.channelIds.includes(channelId)) {
                this.setData({ channelIds: [...this.data.channelIds, channelId] })
            }
        }
    }

    private onSpaceChannelDeleted = (streamId: string, channelId: string) => {
        if (streamId === this.data.id) {
            delete this.channels[channelId]
            this.setData({ channelIds: this.data.channelIds.filter((id) => id !== channelId) })
        }
    }

    private onSpaceChannelUpdated = (
        streamId: string,
        _channelId: string,
        _updatedAtEventNum: bigint,
    ) => {
        if (streamId === this.data.id) {
            // refetch the channel data from on chain
        }
    }
}
