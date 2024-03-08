import { CreateChannelInfo, CreateSpaceInfo } from 'use-towns-client/src/types/towns-types'
import { BigNumber, Wallet, ethers } from 'ethers'
import { TownsTestClient, TownsTestClientProps } from './TownsTestClient'

import { TownsTestWeb3Provider } from './TownsTestWeb3Provider'
import { TownsClient } from '../../../src/client/TownsClient'
import { waitFor } from '@testing-library/dom'
import { RoleDetails } from '../../../src/types/web3-types'
import {
    BasicRoleInfo,
    Permission,
    getFilteredRolesFromSpace,
    IArchitectBase,
    NoopRuleData,
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
    const dummyProvider = new TownsTestWeb3Provider()
    return (await dummyProvider.getNetwork()).chainId
}

/**
 * Create N clients with unique names and random wallet addresses
 * waits for the clients to start up
 */
export async function registerAndStartClients(
    clientNames: string[],
    props?: TownsTestClientProps,
): Promise<Record<string, TownsTestClient>> {
    // get the chain id for the test network
    const chainId = await getChainId()
    // create new test clients
    const clients = clientNames.map((name) => new TownsTestClient(chainId, name, props))
    // start them up
    await Promise.all(clients.map((client) => client.registerWalletAndStartClient()))
    // all clients need funds to create or join a space
    await Promise.all(clients.map((client) => client.fundWallet()))
    // return a dictionary of clients
    return clients.reduce((records: Record<string, TownsTestClient>, client: TownsTestClient) => {
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
    props?: TownsTestClientProps,
): Promise<TownsTestClient> {
    const chainId = await getChainId()
    try {
        const wallet = await walletPromise
        const client = new TownsTestClient(chainId, name, props, wallet)

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

export async function fundWallet(walletToFund: ethers.Wallet) {
    const provider = getJsonProvider()
    const amountInWei = ethers.BigNumber.from(10).pow(18).toHexString()

    const result = provider.send('anvil_setBalance', [walletToFund.address, amountInWei])

    await result
}

/**
 * Create a town with an "Member" role that is gated by a membership token + towns token
 */
export async function createTestSpaceGatedByTownsNfts(
    client: TownsTestClient,
    rolePermissions: Permission[],
    createSpaceInfo?: CreateSpaceInfo,
): Promise<string | undefined> {
    if (!client.walletAddress) {
        throw new Error('client.walletAddress is undefined')
    }

    const membershipInfo: IArchitectBase.MembershipStruct = {
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
            everyone: true,
            users: [],
            ruleData: NoopRuleData,
        },
    }

    return waitForWithRetries(
        () => {
            if (!createSpaceInfo) {
                createSpaceInfo = {
                    name: client.makeUniqueName(),
                }
            }
            return client.createSpace(createSpaceInfo, membershipInfo)
        },
        {
            intervalMs: 1000 * 5,
            timeoutMs: 1000 * 60,
        },
    )
}

/**
 * Create a town with an "Everyone" role that is gated only by a membership token
 */
export async function createTestSpaceGatedByTownNft(
    client: TownsTestClient,
    rolePermissions: Permission[],
    createSpaceInfo?: CreateSpaceInfo,
): Promise<string | undefined> {
    if (!createSpaceInfo) {
        createSpaceInfo = {
            name: client.makeUniqueName(),
        }
    }

    if (!client.walletAddress) {
        throw new Error('client.walletAddress is undefined')
    }

    // Everyone role
    const membershipInfo: IArchitectBase.MembershipStruct = {
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
            users: [],
            ruleData: NoopRuleData,
        },
    }

    return waitForWithRetries(
        () => {
            if (!createSpaceInfo) {
                createSpaceInfo = {
                    name: client.makeUniqueName(),
                }
            }
            return client.createSpace(createSpaceInfo, membershipInfo)
        },
        {
            intervalMs: 1000 * 5,
            timeoutMs: 1000 * 60,
        },
    )
}

export async function createTestChannelWithSpaceRoles(
    client: TownsTestClient,
    createChannelInfo: CreateChannelInfo,
): Promise<string | undefined> {
    if (createChannelInfo.roleIds.length === 0) {
        // In the app, the user is shown roles from the space and chooses
        // at least one role from the UI.
        // For testing, get the roles from the space and select all of them.
        const filteredRoles = await getFilteredRolesFromSpace(
            client.spaceDapp,
            createChannelInfo.parentSpaceId,
        )
        for (const r of filteredRoles) {
            createChannelInfo.roleIds.push(BigNumber.from(r.roleId).toNumber())
        }
    }

    return waitForWithRetries(() => client.createChannel(createChannelInfo, client.provider.wallet))
}

export async function findRoleByName(
    client: TownsClient,
    spaceId: string,
    roleName: string,
    roles?: BasicRoleInfo[],
): Promise<RoleDetails | null> {
    roles = roles ?? (await getFilteredRolesFromSpace(client.spaceDapp, spaceId))
    console.log('findRoleByName roles', roles)
    for (const r of roles) {
        if (r.name === roleName) {
            const result = await client.spaceDapp.getRole(
                spaceId,
                BigNumber.from(r.roleId).toNumber(),
            )
            console.log('findRoleByName result', result)
            return result
        }
    }
    console.log('findRoleByName not found', roleName)
    return null
}

export function assertRoleEquals(actual: RoleDetails, expected: RoleDetails) {
    expect(actual.name).toEqual(expected.name)
    expect(actual.permissions.length).toEqual(expected.permissions.length)
    expect(actual.permissions).toEqual(expect.arrayContaining(expected.permissions))
    /*
    expect(actual.ruleData).toEqual(expected.ruleData)
    const actualTokenAddresses = actual.tokens.map((t) => t.contractAddress)
    const expectedTokenAddresses = expected.tokens.map((t) => t.contractAddress)
    expect(actualTokenAddresses).toEqual(expect.arrayContaining(expectedTokenAddresses))
    */
    expect(actual.users.length).toEqual(expected.users.length)
    expect(actual.users).toEqual(expect.arrayContaining(expected.users))
}

/**
 * Wait for a promise to resolve, retrying if it fails
 */
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
