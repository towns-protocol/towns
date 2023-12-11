import { Client } from './client'
import { ISpaceDapp, Permission } from '@river/web3'
import { makeUniqueChannelStreamId, makeUniqueSpaceStreamId } from './id'
import { getFilteredRolesFromSpace } from '@river/web3/dist/ContractHelpers'
import { BigNumber, ethers } from 'ethers'
import { dlog } from './dlog'

const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

const log = dlog('csb:test:synthetic')
export class RiverSDK {
    private readonly spaceDapp: ISpaceDapp
    private client: Client
    private walletWithProvider: ethers.Wallet
    constructor(spaceDapp: ISpaceDapp, client: Client, walletWithProvider: ethers.Wallet) {
        this.spaceDapp = spaceDapp
        this.client = client
        this.walletWithProvider = walletWithProvider
    }

    public async createChannel(townId: string, channelName: string, channelTopic: string) {
        const channelStreamId = makeUniqueChannelStreamId()
        const filteredRoles = await getFilteredRolesFromSpace(this.spaceDapp, townId)
        const roleIds = []
        for (const r of filteredRoles) {
            roleIds.push(BigNumber.from(r.roleId).toNumber())
        }
        const transaction = await this.spaceDapp.createChannel(
            townId,
            channelName,
            channelStreamId,
            roleIds,
            this.walletWithProvider,
        )
        await transaction.wait()
        await this.client.createChannel(townId, channelName, channelTopic, channelStreamId)
        await this.client.joinStream(channelStreamId)
    }

    public async createTownWithDefaultChannel(
        townName: string,
        townMetadata: string,
        defaultChannelName: string = 'general',
    ): Promise<{ spaceStreamId: string; defaultChannelStreamId: string }> {
        const spaceId: RoomIdentifier = makeRoomIdentifier(makeUniqueSpaceStreamId())
        const channelId: RoomIdentifier = makeRoomIdentifier(makeUniqueChannelStreamId())
        log('Creating space: ', spaceId.networkId, ' with channel: ', channelId.networkId)

        const membershipInfo = {
            settings: {
                name: 'Everyone',
                symbol: 'MEMBER',
                price: 0,
                maxSupply: 1000,
                duration: 0,
                currency: ETH_ADDRESS,
                feeRecipient: this.client.userId,
                freeAllocation: 0,
                pricingModule: ethers.constants.AddressZero,
            },
            permissions: [
                Permission.Read,
                Permission.Write,
                Permission.AddRemoveChannels,
                Permission.ModifySpaceSettings,
            ],
            requirements: {
                everyone: true,
                tokens: [],
                users: [],
            },
        }

        const createSpaceTransaction = await this.spaceDapp.createSpace(
            {
                spaceId: spaceId.networkId,
                spaceName: townName,
                spaceMetadata: townMetadata,
                channelId: channelId.networkId,
                channelName: defaultChannelName,
                membership: membershipInfo,
            },
            this.walletWithProvider,
        )
        await createSpaceTransaction.wait()

        const spaceStreamId = await this.client.createSpace(spaceId.networkId)
        log('Created space by client: ', spaceStreamId)
        await this.client.joinStream(spaceStreamId.streamId)

        await this.client.createChannel(
            spaceId.networkId,
            defaultChannelName,
            '',
            channelId.networkId,
        )
        log('Created channel by client: ', channelId.networkId)
        // await this.client.joinStream(channelId.networkId)
        return {
            spaceStreamId: spaceId.networkId,
            defaultChannelStreamId: channelId.networkId,
        }
    }
}

type RoomIdentifier = {
    slug: string
    networkId: string
}

function makeRoomIdentifier(roomId: string): RoomIdentifier {
    return {
        slug: encodeURIComponent(roomId),
        networkId: roomId,
    }
}
