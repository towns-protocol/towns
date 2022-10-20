import {
    CreateSpaceInfo,
    RoomIdentifier,
    RoomVisibility,
} from 'use-zion-client/src/types/matrix-types'

import { DataTypes } from '@harmony/contracts/localhost/typings/types/ZionSpaceManager'
import { EventTimeline } from 'matrix-js-sdk'
import { TestConstants } from './TestConstants'
import { ZionTestClient } from './ZionTestClient'
import { ZionTestWeb3Provider } from './ZionTestWeb3Provider'
import { ethers, Wallet } from 'ethers'
import { getContractInfo } from 'use-zion-client/src/client/web3/ZionContracts'

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

export async function registerAndStartClient(
    name: string,
    wallet: ethers.Wallet,
    props?: { disableEncryption?: boolean },
): Promise<ZionTestClient> {
    // get the chain id for the test network
    const dummyProvider = new ZionTestWeb3Provider(wallet)
    const chainId = (await dummyProvider.getNetwork()).chainId
    const client = new ZionTestClient(chainId, name, props?.disableEncryption)
    await client.registerWalletAndStartClient()
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

export async function createSpaceWithTokenEntitlement(
    client: ZionTestClient,
    permissions: string[],
    creaetSpaceInfo?: CreateSpaceInfo,
): Promise<RoomIdentifier | undefined> {
    const contractInfo = getContractInfo(1337)

    if (!creaetSpaceInfo) {
        creaetSpaceInfo = {
            name: client.makeUniqueName(),
            visibility: RoomVisibility.Private,
        }
    }

    const tokenEntitlement: DataTypes.CreateSpaceTokenEntitlementDataStruct = {
        entitlementModuleAddress: contractInfo.spaceManager.addresses.tokengranted,
        tokenAddress: contractInfo.council.addresses.councilnft,
        quantity: 1,
        description: 'Zion Council NFT',
        permissions,
        roleName: 'Member',
    }

    const roomId = await client.createWeb3SpaceWithTokenEntitlement(
        creaetSpaceInfo,
        tokenEntitlement,
    )

    return roomId
}
