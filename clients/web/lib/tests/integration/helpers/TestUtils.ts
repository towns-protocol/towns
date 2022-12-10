import {
    CreateChannelInfo,
    CreateSpaceInfo,
    RoomVisibility,
} from 'use-zion-client/src/types/matrix-types'
import { RoomIdentifier } from 'use-zion-client/src/types/room-identifier'
import { EventTimeline } from 'matrix-js-sdk'
import { TestConstants } from './TestConstants'
import { ZionTestClient } from './ZionTestClient'
import { ZionTestWeb3Provider } from './ZionTestWeb3Provider'
import { ethers, Wallet } from 'ethers'
import {
    createExternalTokenEntitlements,
    createPermissions,
    getFilteredRolesFromSpace,
    getZionTokenAddress,
} from 'use-zion-client/src/client/web3/ZionContracts'
import { DataTypes } from '../../../src/client/web3/shims/ZionSpaceManagerShim'
import { Permission } from '../../../src/client/web3/ZionContractTypes'

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

export async function createTestSpaceWithZionMemberRole(
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

    const permissions = createPermissions(tokenGrantedPermissions)
    const zionTokenAddress = getZionTokenAddress(client.chainId)
    const externalTokenEntitlements = createExternalTokenEntitlements([zionTokenAddress])
    const tokenEntitlement: DataTypes.CreateSpaceEntitlementDataStruct = {
        roleName: 'Member',
        permissions,
        externalTokenEntitlements,
        users: [],
    }

    const everyonePerms = createPermissions(everyonePermissions)
    return await client.createWeb3Space(createSpaceInfo, tokenEntitlement, everyonePerms)
}

export async function createTestSpaceWithEveryoneRole(
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
    const tokenEntitlement: DataTypes.CreateSpaceEntitlementDataStruct = {
        roleName: '',
        permissions: [],
        externalTokenEntitlements: [],
        users: [],
    }

    const everyonePerms = createPermissions(everyonePermissions)
    return await client.createWeb3Space(createSpaceInfo, tokenEntitlement, everyonePerms)
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

    return await client.createWeb3Channel(createChannelInfo)
}
