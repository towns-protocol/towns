import { Client } from './client'
import { IUseropSpaceDapp, MembershipStruct, Permission } from '@river/web3'
import { makeUniqueChannelStreamId, makeUniqueSpaceStreamId } from './id'
import { getFilteredRolesFromSpace } from '@river/web3/dist/ContractHelpers'
import { BigNumber, ethers } from 'ethers'
import { dlog } from '@river/mecholm'

const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

const log = dlog('csb:test:synthetic')
export class RiverSDK {
    private readonly spaceDapp: IUseropSpaceDapp
    private client: Client
    private walletWithProvider: ethers.Wallet
    constructor(spaceDapp: IUseropSpaceDapp, client: Client, walletWithProvider: ethers.Wallet) {
        this.spaceDapp = spaceDapp
        this.client = client
        this.walletWithProvider = walletWithProvider
    }

    public async createChannel(
        townId: string,
        channelName: string,
        channelTopic: string,
    ): Promise<string> {
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
        return channelStreamId
    }

    public async createTownWithDefaultChannel(
        townName: string,
        townMetadata: string,
        defaultChannelName: string = 'general',
    ): Promise<{ spaceStreamId: string; defaultChannelStreamId: string }> {
        const spaceId: string = makeUniqueSpaceStreamId()
        const channelId: string = makeUniqueChannelStreamId()
        log('Creating space: ', spaceId, ' with channel: ', channelId)

        const membershipInfo: MembershipStruct = {
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
                rule: ethers.constants.AddressZero,
            },
        }

        const createSpaceTransaction = await this.spaceDapp.createSpace(
            {
                spaceId: spaceId,
                spaceName: townName,
                spaceMetadata: townMetadata,
                channelId: channelId,
                channelName: defaultChannelName,
                membership: membershipInfo,
            },
            this.walletWithProvider,
        )
        await createSpaceTransaction.wait()

        const spaceStreamId = await this.client.createSpace(spaceId)
        log('Created space by client: ', spaceStreamId)
        await this.client.joinStream(spaceStreamId.streamId)

        await this.client.createChannel(spaceId, defaultChannelName, '', channelId)
        log('Created channel by client: ', channelId)
        // await this.client.joinStream(channelId.networkId)
        return {
            spaceStreamId: spaceId,
            defaultChannelStreamId: channelId,
        }
    }

    //TODO: make it nice - it is just a hack
    public async joinTown(townId: string) {
        const hasMembership = await this.spaceDapp.hasTownMembership(
            townId,
            this.walletWithProvider.address,
        )
        if (!hasMembership) {
            // mint membership
            const transaction = await this.spaceDapp.joinTown(
                townId,
                this.walletWithProvider.address,
                this.walletWithProvider,
            )
            await transaction.wait()
        }

        await this.client.joinStream(townId)
    }

    //TODO: make it nice - it is just a hack
    public async joinChannel(channelId: string) {
        await this.client.joinStream(channelId)
    }

    //TODO: make it nice - it is just a hack
    public async getAvailableChannels(townId: string): Promise<Map<string, string>> {
        const streamStateView = await this.client.getStream(townId)
        const result = new Map<string, string>()
        streamStateView.spaceContent.spaceChannelsMetadata.forEach((channelProperties, id) => {
            result.set(id, channelProperties.name)
        })
        return result
    }
}
