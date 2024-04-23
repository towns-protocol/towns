/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import { Client } from './client'
import {
    ISpaceDapp,
    MembershipStruct,
    Permission,
    NoopRuleData,
    getFilteredRolesFromSpace,
} from '@river-build/web3'
import { makeDefaultChannelStreamId, makeSpaceStreamId, makeUniqueChannelStreamId } from './id'
import { BigNumber, ethers } from 'ethers'
import { dlog } from '@river-build/dlog'

const ETH_ADDRESS = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE'

const log = dlog('csb:test:synthetic')
export class RiverSDK {
    private readonly spaceDapp: ISpaceDapp
    public client: Client
    private walletWithProvider: ethers.Wallet
    constructor(spaceDapp: ISpaceDapp, client: Client, walletWithProvider: ethers.Wallet) {
        this.spaceDapp = spaceDapp
        this.client = client
        this.walletWithProvider = walletWithProvider
    }

    public async createChannel(
        spaceId: string,
        channelName: string,
        channelTopic: string,
    ): Promise<string> {
        const channelStreamId = makeUniqueChannelStreamId(spaceId)
        const filteredRoles = await getFilteredRolesFromSpace(this.spaceDapp, spaceId)
        const roleIds = []
        for (const r of filteredRoles) {
            roleIds.push(BigNumber.from(r.roleId).toNumber())
        }
        const transaction = await this.spaceDapp.createChannel(
            spaceId,
            channelName,
            channelStreamId,
            roleIds,
            this.walletWithProvider,
        )
        await transaction.wait()
        await this.client.createChannel(spaceId, channelName, channelTopic, channelStreamId)
        await this.client.joinStream(channelStreamId)
        return channelStreamId
    }

    public async createSpaceWithDefaultChannel(
        spaceName: string,
        spaceMetadata: string,
        defaultChannelName: string = 'general',
    ): Promise<{ spaceStreamId: string; defaultChannelStreamId: string }> {
        log('Creating space: ')

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
            permissions: [Permission.Read, Permission.Write, Permission.AddRemoveChannels],
            requirements: {
                everyone: true,
                users: [],
                ruleData: NoopRuleData,
            },
        }

        const createSpaceTransaction = await this.spaceDapp.createSpace(
            {
                spaceName: spaceName,
                spaceMetadata: spaceMetadata,
                channelName: defaultChannelName,
                membership: membershipInfo,
            },
            this.walletWithProvider,
        )
        const receipt = await createSpaceTransaction.wait()
        const spaceAddress = this.spaceDapp.getSpaceAddress(receipt)
        expect(spaceAddress).toBeDefined()
        const spaceId = makeSpaceStreamId(spaceAddress!)
        const channelId = makeDefaultChannelStreamId(spaceAddress!)

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

    public async createSpaceAndChannel(
        spaceName: string,
        spaceMetadata: string,
        channelName: string,
    ): Promise<{ spaceStreamId: string; defaultChannelStreamId: string }> {
        log('Creating space: ', spaceName, ' with channel: ', channelName)
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
            permissions: [Permission.Read, Permission.Write, Permission.AddRemoveChannels],
            requirements: {
                everyone: true,
                users: [],
                ruleData: NoopRuleData,
            },
        }

        log('transaction start creating space')
        const createSpaceTransaction = await this.spaceDapp.createSpace(
            {
                spaceName: spaceName,
                spaceMetadata: spaceMetadata,
                channelName: channelName,
                membership: membershipInfo,
            },
            this.walletWithProvider,
        )
        const receipt = await createSpaceTransaction.wait()
        log('transaction receipt', receipt)
        if (receipt.status !== 1) {
            throw new Error('Failed to create space')
        }
        const spaceAddress = this.spaceDapp.getSpaceAddress(receipt)
        if (!spaceAddress) {
            throw new Error('Failed to get space address')
        }
        const spaceId = makeSpaceStreamId(spaceAddress)
        const channelId = makeDefaultChannelStreamId(spaceAddress)

        const spaceStreamId = await this.client.createSpace(spaceId)
        await this.client.joinStream(spaceStreamId.streamId)

        await this.client.createChannel(spaceId, channelName, '', channelId)
        // await this.client.joinStream(channelId.networkId)
        return {
            spaceStreamId: spaceId,
            defaultChannelStreamId: channelId,
        }
    }

    //TODO: make it nice - it is just a hack
    public async joinSpace(spaceId: string) {
        const hasMembership = await this.spaceDapp.hasSpaceMembership(
            spaceId,
            this.walletWithProvider.address,
        )
        if (!hasMembership) {
            // mint membership
            const transaction = await this.spaceDapp.joinSpace(
                spaceId,
                this.walletWithProvider.address,
                this.walletWithProvider,
            )
            await transaction.wait()
        }

        await this.client.joinStream(spaceId)
    }

    //TODO: make it nice - it is just a hack
    public async joinChannel(channelId: string) {
        await this.client.joinStream(channelId)
    }

    public async leaveChannel(channelId: string) {
        await this.client.leaveStream(channelId)
    }
    //TODO: make it nice - it is just a hack
    public async getAvailableChannels(spaceId: string): Promise<Map<string, string>> {
        const streamStateView = await this.client.getStream(spaceId)
        const result = new Map<string, string>()
        streamStateView.spaceContent.spaceChannelsMetadata.forEach((channelProperties, id) => {
            result.set(id, channelProperties.name ?? '')
        })
        return result
    }

    public async sendTextMessage(channelId: string, message: string) {
        await this.client.sendMessage(channelId, message)
    }
}

export class SpacesWithChannels {
    private records: [string, string[]][] = []

    // Add a new record to the array
    addRecord(key: string, values: string[]) {
        this.records.push([key, values])
    }

    // Get all records
    getRecords(): [string, string[]][] {
        return this.records
    }

    // Get values for a specific key
    getValuesForKey(key: string): string[] | undefined {
        const record = this.records.find((pair) => pair[0] === key)
        return record ? record[1] : undefined
    }

    // Add an element to the proper second array based on the value of the element in the first array
    addChannelToSpace(key: string, elementToAdd: string) {
        const record = this.records.find((pair) => pair[0] === key)

        if (record) {
            record[1].push(elementToAdd)
        } else {
            this.records.push([key, [elementToAdd]])
        }
    }
}

export class ChannelSpacePairs {
    private records: [string, string][] = []

    // Add a new record to the array
    addRecord(key: string, values: string) {
        this.records.push([key, values])
    }

    // Get all records
    getRecords(): [string, string][] {
        return this.records
    }

    // Get values for a specific key
    getValuesForKey(key: string): string | undefined {
        const record = this.records.find((pair) => pair[0] === key)
        return record ? record[1] : undefined
    }

    recoverFromJSON(json: string) {
        const data = JSON.parse(json)
        //eslint-disable-next-line
        this.records = data.records
    }
}

export class ChannelTrackingInfo {
    private channelId: string
    private tracked: boolean
    private numUsersJoined: number

    constructor(channelId: string) {
        this.channelId = channelId
        this.tracked = false
        this.numUsersJoined = 0
    }

    public getChannelId(): string {
        return this.channelId
    }

    public getTracked(): boolean {
        return this.tracked
    }

    public getNumUsersJoined(): number {
        return this.numUsersJoined
    }

    public setChannelId(channelId: string) {
        this.channelId = channelId
    }

    public setTracked(tracked: boolean) {
        this.tracked = tracked
    }

    public setNumUsersJoined(numUsersJoined: number) {
        this.numUsersJoined = numUsersJoined
    }
}

export function startsWithSubstring(strA: string, strB: string): boolean {
    return strA.startsWith(strB)
}

export function getRandomInt(n: number): number {
    // Generate a random decimal number between 0 (inclusive) and 1 (exclusive)
    const randomDecimal = Math.random()

    // Scale the random number to the range [0, n)
    const randomInt = Math.floor(randomDecimal * n)

    return randomInt
}

export async function pauseForXMiliseconds(x: number) {
    await new Promise((resolve) => setTimeout(resolve, x))
}
