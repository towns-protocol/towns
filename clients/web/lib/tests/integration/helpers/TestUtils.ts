import {
    CreateChannelInfo,
    CreateSpaceInfo,
    RoomVisibility,
} from 'use-zion-client/src/types/zion-types'
import { Permission, RoleDetails } from '../../../src/client/web3/ContractTypes'
import { Wallet, ethers } from 'ethers'
import { ZionTestClient, ZionTestClientProps } from './ZionTestClient'
import {
    createExternalTokenStruct,
    getFilteredRolesFromSpace,
    getMemberNftAddress,
} from 'use-zion-client/src/client/web3/ContractHelpers'

import { EventTimeline } from 'matrix-js-sdk'
import { RoomIdentifier } from 'use-zion-client/src/types/room-identifier'
import { SpaceDataTypes } from '../../../src/client/web3/shims/SpaceShim'
import { SpaceFactoryDataTypes } from '../../../src/client/web3/shims/SpaceFactoryShim'
import { SpaceProtocol } from '../../../src/client/ZionClientTypes'
import { TestConstants } from './TestConstants'
import { ZionTestWeb3Provider } from './ZionTestWeb3Provider'
import { ZionClient } from '../../../src/client/ZionClient'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function assert(condition: any, msg?: string): asserts condition {
    if (!condition) {
        throw new Error(msg)
    }
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

export function getPrimaryProtocol(): SpaceProtocol {
    return process.env.PRIMARY_PROTOCOL && process.env.PRIMARY_PROTOCOL === SpaceProtocol.Casablanca
        ? SpaceProtocol.Casablanca
        : SpaceProtocol.Matrix
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
    wallet: Wallet,
    props?: ZionTestClientProps,
): Promise<ZionTestClient> {
    const chainId = await getChainId()
    const client = new ZionTestClient(chainId, name, props, wallet)

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
    let retries = 0
    let isFunded = false
    while (!isFunded && retries < 5) {
        try {
            isFunded = await _fundWallet(walletToFund, amount)
        } catch (error) {
            if ((error as Error).message.includes('nonce has already been used')) {
                // we have multiple tests running in parallel, so this is expected.
                // ignore this error and try again
            } else {
                throw error
            }
        } finally {
            retries++
        }
    }

    if (!isFunded) {
        throw new Error('Failed to fund wallet')
    }
}

async function _fundWallet(walletToFund: ethers.Wallet, amount = 0.1): Promise<boolean> {
    const fundedWallet = TestConstants.getWalletWithoutNft()
    const result = await fundedWallet.sendTransaction({
        from: fundedWallet.address,
        to: walletToFund.address,
        value: ethers.utils.parseEther(amount.toString()),
    })
    await result.wait()
    return true
}

export function createTestSpaceWithZionMemberRole(
    client: ZionTestClient,
    tokenGrantedPermissions: Permission[],
    everyonePermissions: Permission[] = [],
    createSpaceInfo?: CreateSpaceInfo,
): Promise<RoomIdentifier | undefined> {
    if (!createSpaceInfo) {
        createSpaceInfo = {
            name: client.makeUniqueName(),
            visibility: RoomVisibility.Public,
        }
    }

    const memberNftAddress = getMemberNftAddress(client.chainId)
    const tokens = createExternalTokenStruct([memberNftAddress])
    const tokenEntitlement: SpaceFactoryDataTypes.CreateSpaceExtraEntitlementsStruct = {
        roleName: 'Member',
        permissions: tokenGrantedPermissions,
        tokens,
        users: [],
    }

    return client.createSpace(createSpaceInfo, tokenEntitlement, everyonePermissions)
}

export function createTestSpaceWithEveryoneRole(
    client: ZionTestClient,
    everyonePermissions: Permission[] = [],
    createSpaceInfo?: CreateSpaceInfo,
): Promise<RoomIdentifier | undefined> {
    if (!createSpaceInfo) {
        createSpaceInfo = {
            name: client.makeUniqueName(),
            visibility: RoomVisibility.Public,
        }
    }

    // No member role. Everyone role is the only role.
    const tokenEntitlement: SpaceFactoryDataTypes.CreateSpaceExtraEntitlementsStruct = {
        roleName: '',
        permissions: [],
        tokens: [],
        users: [],
    }

    return client.createSpace(createSpaceInfo, tokenEntitlement, everyonePermissions)
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
            client,
            createChannelInfo.parentSpaceId.networkId,
        )
        for (const r of filteredRoles) {
            createChannelInfo.roleIds.push(r.roleId.toNumber())
        }
    }

    return client.createChannel(createChannelInfo)
}

export async function findRoleByName(
    client: ZionClient,
    spaceId: string,
    roleName: string,
    roles?: SpaceDataTypes.RoleStructOutput[],
): Promise<RoleDetails | null> {
    let role: RoleDetails | null = null
    roles = roles ?? (await getFilteredRolesFromSpace(client, spaceId))
    for (const r of roles) {
        if (r.name === roleName) {
            // found
            // get the role details
            role = await client.spaceDapp.getRole(spaceId, r.roleId.toNumber())
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
