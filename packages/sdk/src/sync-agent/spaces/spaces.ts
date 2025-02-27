import { Identifiable, LoadPriority, Store } from '../../store/store'
import {
    PersistedModel,
    PersistedObservable,
    persistedObservable,
} from '../../observable/persistedObservable'
import { Space } from './models/space'
import { UserMemberships, UserMembershipsModel } from '../user/models/userMemberships'
import { MembershipOp } from '@river-build/proto'
import { isSpaceStreamId, makeDefaultChannelStreamId, makeSpaceStreamId } from '../../id'
import { RiverConnection } from '../river-connection/riverConnection'
import { CreateSpaceParams, SpaceDapp } from '@river-build/web3'
import { makeDefaultMembershipInfo } from '../utils/spaceUtils'
import { ethers } from 'ethers'
import { check, dlogger } from '@river-build/dlog'

const logger = dlogger('csb:spaces')

export interface SpacesModel extends Identifiable {
    id: '0' // single data blobs need a fixed key
    spaceIds: string[] // joined spaces
}

@persistedObservable({ tableName: 'spaces' })
export class Spaces extends PersistedObservable<SpacesModel> {
    private spaces: Record<string, Space> = {}

    constructor(
        store: Store,
        private riverConnection: RiverConnection,
        private userMemberships: UserMemberships,
        private spaceDapp: SpaceDapp,
    ) {
        super({ id: '0', spaceIds: [] }, store, LoadPriority.high)
    }

    protected override onLoaded() {
        this.userMemberships.subscribe(
            (value) => {
                this.onUserMembershipsChanged(value)
            },
            { fireImediately: true },
        )
    }

    getSpace(spaceId: string): Space {
        check(isSpaceStreamId(spaceId), 'Invalid spaceId')
        if (!this.spaces[spaceId]) {
            this.spaces[spaceId] = new Space(
                spaceId,
                this.riverConnection,
                this.store,
                this.spaceDapp,
            )
        }
        return this.spaces[spaceId]
    }

    private onUserMembershipsChanged(value: PersistedModel<UserMembershipsModel>) {
        if (value.status === 'loading') {
            return
        }

        const spaceIds = Object.values(value.data.memberships)
            .filter((m) => isSpaceStreamId(m.streamId) && m.op === MembershipOp.SO_JOIN)
            .map((m) => m.streamId)

        this.setData({ spaceIds })

        for (const spaceId of spaceIds) {
            if (!this.spaces[spaceId]) {
                this.spaces[spaceId] = new Space(
                    spaceId,
                    this.riverConnection,
                    this.store,
                    this.spaceDapp,
                )
            }
        }
    }

    async createSpace(
        params: Partial<Omit<CreateSpaceParams, 'spaceName'>> & { spaceName: string },
        signer: ethers.Signer,
    ) {
        const membershipInfo =
            params.membership ??
            (await makeDefaultMembershipInfo(this.spaceDapp, this.riverConnection.userId))
        const channelName = params.channelName ?? 'general'
        const transaction = await this.spaceDapp.createSpace(
            {
                spaceName: params.spaceName,
                uri: params.uri ?? '',
                channelName: channelName,
                membership: membershipInfo,
                shortDescription: params.shortDescription,
                longDescription: params.longDescription,
            },
            signer,
        )
        const receipt = await transaction.wait()
        logger.log('transaction receipt', receipt)
        const spaceAddress = this.spaceDapp.getSpaceAddress(receipt, await signer.getAddress())
        if (!spaceAddress) {
            throw new Error('Space address not found')
        }
        logger.log('spaceAddress', spaceAddress)
        const spaceId = makeSpaceStreamId(spaceAddress)
        const defaultChannelId = makeDefaultChannelStreamId(spaceAddress)
        logger.log('spaceId, defaultChannelId', { spaceId, defaultChannelId })
        await this.riverConnection.login({ spaceId })
        await this.riverConnection.call(async (client) => {
            await client.createSpace(spaceId)
            await client.createChannel(spaceId, channelName, '', defaultChannelId)
        })
        return { spaceId, defaultChannelId }
    }

    async joinSpace(spaceId: string, ...args: Parameters<Space['join']>) {
        const space = this.getSpace(spaceId)
        return space.join(...args)
    }
}
