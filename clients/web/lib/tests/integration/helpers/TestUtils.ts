import { CreateChannelInfo, CreateSpaceInfo } from 'use-zion-client/src/types/zion-types'
import { BigNumber, Wallet, ethers } from 'ethers'
import { ZionTestClient, ZionTestClientProps } from './ZionTestClient'

import { EventTimeline } from 'matrix-js-sdk'
import { RoomIdentifier } from 'use-zion-client/src/types/room-identifier'
import { TransactionStatus } from '../../../src/client/ZionClientTypes'
import { ZionTestWeb3Provider } from './ZionTestWeb3Provider'
import { ZionClient } from '../../../src/client/ZionClient'
import { waitFor } from '@testing-library/dom'
import { SignerUndefinedError } from '../../../src/types/error-types'
import { useTransactionStore } from '../../../src/store/use-transactions-store'
import { BlockchainTransactionType, RoleDetails } from '../../../src/types/web3-types'
import {
    BasicRoleInfo,
    Permission,
    createExternalTokenStruct,
    getFilteredRolesFromSpace,
    getMemberNftAddress,
    ITownArchitectBase,
} from '@river/web3'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function assert(condition: any, msg?: string): asserts condition {
    if (!condition) {
        throw new Error(msg)
    }
}

export function getJsonProvider() {
    const providerUrl = process.env.ETHERS_NETWORK ?? 'http://127.0.0.1:8545'

    return new ethers.providers.JsonRpcProvider(providerUrl)
}

export function parseOptInt(value?: string): number | undefined {
    if (value === undefined) {
        return undefined
    }
    const parsed = parseInt(value)
    if (isNaN(parsed)) {
        return undefined
    }
    return parsed
}

export async function getChainId(): Promise<number> {
    const dummyProvider = new ZionTestWeb3Provider()
    return (await dummyProvider.getNetwork()).chainId
}

/**
 * Create N clients with unique names and random wallet addresses
 * waits for the clients to start up
 */
export async function registerAndStartClients(
    clientNames: string[],
    props?: ZionTestClientProps,
): Promise<Record<string, ZionTestClient>> {
    // get the chain id for the test network
    const chainId = await getChainId()
    // create new matrix test clients
    const clients = clientNames.map((name) => new ZionTestClient(chainId, name, props))
    // start them up
    await Promise.all(clients.map((client) => client.registerWalletAndStartClient()))
    // all clients need funds to create or join a space
    await Promise.all(clients.map((client) => client.fundWallet()))
    // return a dictionary of clients
    return clients.reduce((records: Record<string, ZionTestClient>, client: ZionTestClient) => {
        records[client.name] = client
        return records
    }, {})
}

/**
 * Creates a client with an existing wallet address
 * will "log in" if the user is already registered
 * waits for the client to start up
 */
export async function registerAndStartClient(
    name: string,
    walletPromise: Promise<Wallet>,
    props?: ZionTestClientProps,
): Promise<ZionTestClient> {
    const chainId = await getChainId()
    try {
        const wallet = await walletPromise
        const client = new ZionTestClient(chainId, name, props, wallet)

        if (await client.isUserRegistered()) {
            await client.loginWalletAndStartClient()
        } else {
            await client.registerWalletAndStartClient()
        }

        return client
    } catch (e) {
        console.error('registerAndStartClient error', e)
        throw e
    }
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

export async function fundWallet(walletToFund: ethers.Wallet) {
    const provider = getJsonProvider()
    const amountInWei = ethers.BigNumber.from(10).pow(18).toHexString()

    const result = provider.send('anvil_setBalance', [walletToFund.address, amountInWei])

    console.log('fundWallet tx', result, amountInWei, walletToFund.address)
    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const receipt = await result
    console.log('fundWallet receipt', receipt)
    return true
}

/**
 * Create a town with an "Member" role that is gated by a membership token + zion token
 */
export async function createTestSpaceGatedByTownAndZionNfts(
    client: ZionTestClient,
    rolePermissions: Permission[],
    createSpaceInfo?: CreateSpaceInfo,
): Promise<RoomIdentifier | undefined> {
    if (!createSpaceInfo) {
        createSpaceInfo = {
            name: client.makeUniqueName(),
        }
    }

    if (!client.walletAddress) {
        throw new Error('client.walletAddress is undefined')
    }

    const memberNftAddress = getMemberNftAddress(client.chainId)
    const tokens = createExternalTokenStruct([memberNftAddress ?? ''])

    console.log('createTestSpaceGatedByTownAndZionNfts tokens', tokens)

    const membershipInfo: ITownArchitectBase.MembershipStruct = {
        settings: {
            name: 'Member',
            symbol: 'MEMBER',
            price: 0,
            maxSupply: 100,
            duration: 0,
            currency: ethers.constants.AddressZero,
            feeRecipient: client.walletAddress,
            freeAllocation: 0,
            pricingModule: ethers.constants.AddressZero,
        },
        permissions: rolePermissions,
        requirements: {
            everyone: false,
            tokens,
            users: [],
        },
    }

    // createSpace is gated by the mock NFT. Mint one for yourself before proceeding.
    await client.mintMockNFT()
    return client.createSpace(createSpaceInfo, membershipInfo)
}

/**
 * Create a town with an "Everyone" role that is gated only by a membership token
 */
export async function createTestSpaceGatedByTownNft(
    client: ZionTestClient,
    rolePermissions: Permission[],
    createSpaceInfo?: CreateSpaceInfo,
): Promise<RoomIdentifier | undefined> {
    if (!createSpaceInfo) {
        createSpaceInfo = {
            name: client.makeUniqueName(),
        }
    }

    if (!client.walletAddress) {
        throw new Error('client.walletAddress is undefined')
    }

    // Everyone role
    const membershipInfo: ITownArchitectBase.MembershipStruct = {
        settings: {
            name: 'Everyone',
            symbol: 'MEMBER',
            price: 0,
            maxSupply: 100,
            duration: 0,
            currency: ethers.constants.AddressZero,
            feeRecipient: client.walletAddress,
            freeAllocation: 0,
            pricingModule: ethers.constants.AddressZero,
        },
        permissions: rolePermissions,
        requirements: {
            everyone: true,
            tokens: [],
            users: [],
        },
    }

    // createSpace is gated by the mock NFT. Mint one for yourself before proceeding.
    await client.mintMockNFT()
    return client.createSpace(createSpaceInfo, membershipInfo)
}

export async function createTestChannelWithSpaceRoles(
    client: ZionTestClient,
    createChannelInfo: CreateChannelInfo,
): Promise<RoomIdentifier | undefined> {
    if (createChannelInfo.roleIds.length === 0) {
        // In the app, the user is shown roles from the space and chooses
        // at least one role from the UI.
        // For testing, get the roles from the space and select all of them.
        const filteredRoles = await getFilteredRolesFromSpace(
            client.spaceDapp,
            createChannelInfo.parentSpaceId.networkId,
        )
        for (const r of filteredRoles) {
            createChannelInfo.roleIds.push(BigNumber.from(r.roleId).toNumber())
        }
    }

    const signer = client.provider.wallet
    if (!signer) {
        throw new SignerUndefinedError()
    }
    // Important for Matrix:
    // Our tests use this to create channels in both React and non-React tests.
    // But if it's a React test, we have to include the same transaction listener logic as use-create-channel-transaction hook
    // otherwise, any space data referenced in the React context - i.e. useSpaceData, which relies on spaceHierarchies - can be out of sync with matrix - matrix will have the data, the blockchain won't
    const txContext = await client.createChannelTransaction(createChannelInfo, signer)
    if (txContext.error) {
        throw txContext.error
    }
    if (txContext.data) {
        useTransactionStore.getState().storeTransaction({
            hash: txContext.transaction?.hash as `0x${string}`,
            type: BlockchainTransactionType.CreateChannel,
            data: {
                parentSpaceId: createChannelInfo.parentSpaceId.networkId,
                spaceId: txContext.data,
            },
        })
    }

    if (txContext.status === TransactionStatus.Pending) {
        const rxContext = await client.waitForCreateChannelTransaction(createChannelInfo, txContext)
        return rxContext?.data
    }
    // Something went wrong. Don't return a room identifier.
    return undefined
}

export async function findRoleByName(
    client: ZionClient,
    spaceId: string,
    roleName: string,
    roles?: BasicRoleInfo[],
): Promise<RoleDetails | null> {
    let role: RoleDetails | null = null
    roles = roles ?? (await getFilteredRolesFromSpace(client.spaceDapp, spaceId))
    for (const r of roles) {
        if (r.name === roleName) {
            // found
            // get the role details
            role = await client.spaceDapp.getRole(spaceId, BigNumber.from(r.roleId).toNumber())
            break
        }
    }
    return role
}

export function assertRoleEquals(actual: RoleDetails, expected: RoleDetails) {
    expect(actual.name).toEqual(expected.name)
    expect(actual.permissions.length).toEqual(expected.permissions.length)
    expect(actual.permissions).toEqual(expect.arrayContaining(expected.permissions))
    expect(actual.tokens.length).toEqual(expected.tokens.length)
    const actualTokenAddresses = actual.tokens.map((t) => t.contractAddress)
    const expectedTokenAddresses = expected.tokens.map((t) => t.contractAddress)
    expect(actualTokenAddresses).toEqual(expect.arrayContaining(expectedTokenAddresses))
    expect(actual.users.length).toEqual(expected.users.length)
    expect(actual.users).toEqual(expect.arrayContaining(expected.users))
}

// some test actions result in 401s before resulting in success, so we need to retry
// most often this happens when joining a channel immediately after creation
export async function waitForWithRetries<T>(
    action: () => Promise<T>,
    options?: { intervalMs?: number; timeoutMs?: number },
) {
    let failMessage = ''
    let result: T | undefined

    try {
        // wait for will keep firing until the promise resolves or it times out
        result = await waitFor(async () => action(), {
            interval: options?.intervalMs ?? 1000 * 3,
            timeout: options?.timeoutMs ?? 1000 * 20,
        })
    } catch (error) {
        failMessage = `waitForWithRetries() Failed action: ${action.toString()} because of error: ${JSON.stringify(
            error,
            Object.getOwnPropertyNames(error),
        )}`
        console.error(failMessage, error)
    }
    // compare with failMessage for easier debugging while running --silent flag
    expect(failMessage).toBe('')

    return result
}
