import {
    CreateChannelInfo,
    CreateSpaceInfo,
    RoomIdentifier,
    RoomVisibility,
} from 'use-zion-client/src/types/matrix-types'

import { EventTimeline } from 'matrix-js-sdk'
import { TestConstants } from './TestConstants'
import { ZionTestClient } from './ZionTestClient'
import { ZionTestWeb3Provider } from './ZionTestWeb3Provider'
import { ethers, Wallet } from 'ethers'
import { getContractInfo } from 'use-zion-client/src/client/web3/ZionContracts'
import { DataTypes } from '../../../src/client/web3/shims/ZionSpaceManagerShim'
import {
    createRolesFromSpace,
    createTokenEntitlementData,
} from '../../../src/client/web3/ContractDataFactory'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function assert(condition: any, msg?: string): asserts condition {
    if (!condition) {
        throw new Error(msg)
    }
}

export async function registerAndStartClients(
    clientNames: string[],
    props?: { disableEncryption?: boolean },
): Promise<Record<string, ZionTestClient>> {
    // get the chain id for the test network
    const dummyProvider = new ZionTestWeb3Provider()
    const chainId = (await dummyProvider.getNetwork()).chainId
    // create new matrix test clients
    const clients = clientNames.map(
        (name) => new ZionTestClient(chainId, name, props?.disableEncryption),
    )
    // start them up
    await Promise.all(clients.map((client) => client.registerWalletAndStartClient()))
    // return a dictionary of clients
    return clients.reduce((records: Record<string, ZionTestClient>, client: ZionTestClient) => {
        records[client.name] = client
        return records
    }, {})
}

export async function registerLoginAndStartClient(
    name: string,
    wallet: Wallet,
    props?: { disableEncryption?: boolean },
): Promise<ZionTestClient> {
    const dummyProvider = new ZionTestWeb3Provider(wallet)
    const chainId = (await dummyProvider.getNetwork()).chainId
    const client = new ZionTestClient(chainId, name, props?.disableEncryption, dummyProvider)

    if (await client.isUserRegistered()) {
        await client.loginWalletAndStartClient()
    } else {
        await client.registerWalletAndStartClient()
    }

    return client
}

export function makeUniqueName(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 4095).toString(16)}`
}

export function logTimeline(timeline?: EventTimeline) {
    if (!timeline) {
        console.log('!!timeline is undefined')
        return
    }
    timeline.getEvents().forEach((event) => {
        console.log('!! timeline event:', event.getType(), event.getSender(), event.getContent())
    })
}

export async function fundWallet(walletToFund: ethers.Wallet, amount = 0.1) {
    const fundedWallet = TestConstants.FUNDED_WALLET_0
    const tx = {
        from: fundedWallet.address,
        to: walletToFund.address,
        value: ethers.utils.parseEther(amount.toString()),
        gasLimit: 1000000,
    }
    const result = await fundedWallet.sendTransaction(tx)
    return result
}

export async function createSpaceWithEntitlement(
    client: ZionTestClient,
    permissions: DataTypes.PermissionStruct[],
    everyonePermissions: DataTypes.PermissionStruct[] = [],
    createSpaceInfo?: CreateSpaceInfo,
): Promise<RoomIdentifier | undefined> {
    const contractInfo = getContractInfo(client.chainId)

    if (!createSpaceInfo) {
        createSpaceInfo = {
            name: client.makeUniqueName(),
            visibility: RoomVisibility.Private,
        }
    }

    const externalTokenEntitlement = createTokenEntitlementData({
        contractAddress: contractInfo.council.addresses.councilnft,
        tag: 'Council NFT Gate',
    })

    const tokenEntitlement: DataTypes.CreateSpaceEntitlementDataStruct = {
        roleName: 'Member',
        permissions: permissions,
        externalTokenEntitlements: [externalTokenEntitlement],
        users: [],
    }

    const roomId = await client.createWeb3Space(
        createSpaceInfo,
        tokenEntitlement,
        everyonePermissions,
    )

    return roomId
}

export async function createChannelWithEntitlement(
    client: ZionTestClient,
    createChannelInfo: CreateChannelInfo,
): Promise<RoomIdentifier | undefined> {
    // get all the roles in the space, and set it on the channel
    const roles: DataTypes.CreateRoleEntitlementDataStruct[] = await createRolesFromSpace(
        client,
        createChannelInfo.parentSpaceId.matrixRoomId,
    )
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    return await client.createWeb3Channel(createChannelInfo, roles)
}
