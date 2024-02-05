import { ITownArchitectBase, Permission } from '@river/web3'
import { ZionTestClient } from '../integration/helpers/ZionTestClient'
import { CreateSpaceInfo } from '../../src/types/zion-types'
import { ethers } from 'ethers'
import { ZionOpts } from '../../src/client/ZionClientTypes'
import { paymasterProxyMiddleware } from '@towns/userops'
import { TestConstants } from '../integration/helpers/TestConstants'

/**
 * Create a town with an "Everyone" role that is gated only by a membership token
 *
 * This is intentionally separate from integration/helpers/TestUtils.createTestSpaceGatedByTownNft
 * b/c it's used against deployed testsnets/stackup and logic may differ
 */
export async function createUngatedSpace(
    client: ZionTestClient,
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
            rule: ethers.constants.AddressZero,
        },
    }

    return client.createSpace(createSpaceInfo, membershipInfo)
}

export function getAccountAbstractionConfig() {
    if (!process.env.AA_RPC_URL) {
        throw new Error('AA_RPC_URL env var not set. Do you have a .env.test.userops file?')
    }
    if (!process.env.AA_BUNDLER_URL) {
        throw new Error('AA_BUNDLER_URL env var not set. Do you have a .env.test.userops file?')
    }

    if (!process.env.AA_PAYMASTER_PROXY_AUTH_SECRET) {
        throw new Error(
            'AA_PAYMASTER_PROXY_AUTH_SECRET env var not set. Do you have a .env.test.userops file?',
        )
    }

    if (process.env.ETHERS_NETWORK?.includes('localhost')) {
        throw new Error(
            'ETHERS_NETWORK should not be set to localhost. Use a testnet. Do you have a .env.test.userops file?',
        )
    }

    const accountAbstractionConfig: ZionOpts['accountAbstractionConfig'] = {
        bundlerUrl: process.env.AA_BUNDLER_URL,
        paymasterProxyUrl: process.env.AA_PAYMASTER_PROXY_URL,
        aaRpcUrl: process.env.AA_RPC_URL,
        paymasterMiddleware: paymasterProxyMiddleware({
            paymasterProxyAuthSecret: process.env.AA_PAYMASTER_PROXY_AUTH_SECRET,
            skipConfirmation: true,
        }),
        // entryPointAddress: process.env.ENTRY_POINT_ADDRESS, // omitted, using stackup default
        // factoryAddress: process.env.FACTORY_ADDRESS, // omitted, using stackup default
    }

    return accountAbstractionConfig
}

/**
 * Generate a random wallet or use a private key if provided
 */
export async function generateRandomUnfundedOrPrivateKeyWallet(privateKey?: string) {
    let wallet
    if (privateKey) {
        wallet = await TestConstants.getWalletFromPrivateKey(privateKey)
    } else {
        wallet = await TestConstants.getUnfundedWallet()
    }
    return wallet
}
