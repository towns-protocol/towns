import { SpaceFactoryReads } from '../contracts/space-factory'
import {
    Address,
    Chain,
    createPublicClient,
    http,
    isAddress,
    PublicClient,
    zeroAddress,
} from 'viem'
import { mainnet, sepolia } from 'viem/chains'
import { computeDelegatorsForProvider } from '../contracts/delegate-registry'
import { dlogger } from '@towns-protocol/utils'
import { XchainConfig } from '../../space/entitlements/entitlement'

const logger = dlogger('csb:getWallets:debug')

export async function getLinkedWallets(
    spaceFactoryReads: SpaceFactoryReads,
    walletAddress: string,
) {
    if (!isAddress(walletAddress)) {
        throw new Error('Invalid wallet address')
    }
    let linkedWallets = await spaceFactoryReads.walletLink.read.getWalletsByRootKey([walletAddress])
    // If there are no linked wallets, consider that the wallet may be linked to another root key.
    if (linkedWallets.length === 0) {
        const possibleRoot = await spaceFactoryReads.walletLink.read.getRootKeyForWallet([
            walletAddress,
        ])
        if (possibleRoot !== zeroAddress) {
            linkedWallets = await spaceFactoryReads.walletLink.read.getWalletsByRootKey([
                possibleRoot,
            ])
            return [possibleRoot, ...linkedWallets]
        }
    }
    return [walletAddress, ...linkedWallets]
}

export async function getLinkedWalletsWithDelegations(
    spaceFactoryReads: SpaceFactoryReads,
    xchainConfig: XchainConfig,
    walletAddress: string,
) {
    const linkedWallets = await getLinkedWallets(spaceFactoryReads, walletAddress)
    const allWallets = new Set<Address>(linkedWallets)
    const delegators = await getMainnetDelegationsForLinkedWallets(linkedWallets, xchainConfig)
    return [...new Set([...allWallets, ...delegators])]
}

export async function getMainnetDelegationsForLinkedWallets(
    linkedWallets: string[],
    config: XchainConfig,
): Promise<Set<Address>> {
    const delegatorSet: Set<Address> = new Set()
    const clients = findEthereumProviders(config)

    for (const cli of clients) {
        const delegators = await computeDelegatorsForProvider(cli, linkedWallets)
        for (const delegator of delegators) {
            delegatorSet.add(delegator)
        }
    }
    return delegatorSet
}

export function findEthereumProviders(xchainConfig: XchainConfig) {
    const ethereumProviders: PublicClient[] = []
    for (const chainId of xchainConfig.ethereumNetworkIds) {
        if (!(chainId in xchainConfig.supportedRpcUrls)) {
            logger.error(`findEthereumProviders: No supported RPC URL for chain id ${chainId}`)
        } else if (!chainMap[chainId]) {
            logger.error(`findEthereumProviders: No chain map for chain id ${chainId}`)
        } else {
            const url = xchainConfig.supportedRpcUrls[chainId]
            ethereumProviders.push(
                createPublicClient({
                    chain: chainMap[chainId],
                    transport: http(url),
                    batch: {
                        multicall: true, // Enable automatic multicall batching
                    },
                }),
            )
        }
    }
    return ethereumProviders
}

const chainMap: Record<number, Chain> = {
    1: mainnet,
    11155111: sepolia,
}
