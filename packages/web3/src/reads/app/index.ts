import { Address } from 'viem'
import { CacheManager } from '../cache/cache-manager'
import { ChainId } from '../clients/get-chain'
import { createReadClient } from '../clients/readClient'
import { makeSpaceFactoryReads, SpaceFactoryReads } from '../contracts/space-factory'
import { bannedWallets, walletAddressIsBanned } from '../aggregators/banned-wallets'
import {
    getLinkedWallets,
    getLinkedWalletsWithDelegations,
    getMainnetDelegationsForLinkedWallets,
} from '../aggregators/get-wallets'
import { XchainConfig } from '../../space/entitlements/entitlement'

export type ReadApp = ReturnType<typeof createReadApp>

export const createReadApp = (args: {
    chainId: ChainId
    url: string
    spaceFactoryAddress: Address
}): {
    wallets: SpaceFactoryReads['walletLink'] & {
        bannedWallets: (args: { spaceId: string }) => Promise<Address[]>
        walletAddressIsBanned: (
            args: {
                spaceId: string
                walletAddress: Address
            },
            opts?: { skipCache?: boolean },
        ) => Promise<boolean>
        getLinkedWallets: (args: { walletAddress: Address }) => Promise<Address[]>
        getLinkedWalletsWithDelegations: (args: {
            walletAddress: Address
            xchainConfig: XchainConfig
        }) => Promise<Address[]>
        getMainnetDelegationsForLinkedWallets: (args: {
            linkedWallets: Address[]
            xchainConfig: XchainConfig
        }) => Promise<Set<string>>
    }
    pricingModules: SpaceFactoryReads['pricingModules']
    platformRequirements: SpaceFactoryReads['platformRequirements']
    cacheManager: CacheManager
    readClient: ReturnType<typeof createReadClient>
} => {
    const cacheManager = new CacheManager()

    const readClient = createReadClient({
        chainId: args.chainId,
        url: args.url,
    })

    const spaceFactoryReads = makeSpaceFactoryReads({
        spaceFactoryAddress: args.spaceFactoryAddress,
        publicClient: readClient,
    })

    return {
        pricingModules: {
            ...spaceFactoryReads.pricingModules,
        },
        platformRequirements: {
            ...spaceFactoryReads.platformRequirements,
        },
        wallets: {
            ...spaceFactoryReads.walletLink,
            bannedWallets: (args) =>
                bannedWallets({
                    spaceId: args.spaceId,
                    bannedTokenIdsCache: cacheManager.bannedTokenIdsCache,
                    ownerOfTokenCache: cacheManager.ownerOfTokenCache,
                    readClient,
                }),
            walletAddressIsBanned: (args, opts) =>
                walletAddressIsBanned(
                    {
                        spaceId: args.spaceId,
                        walletAddress: args.walletAddress,
                        readClient,
                        isTokenBannedCache: cacheManager.isTokenBannedCache,
                    },
                    opts,
                ),
            getLinkedWallets: (args) => getLinkedWallets(spaceFactoryReads, args.walletAddress),
            getLinkedWalletsWithDelegations: (args) =>
                getLinkedWalletsWithDelegations(
                    spaceFactoryReads,
                    args.xchainConfig,
                    args.walletAddress,
                ),
            getMainnetDelegationsForLinkedWallets: (args) =>
                getMainnetDelegationsForLinkedWallets(args.linkedWallets, args.xchainConfig),
        },
        cacheManager,
        readClient,
    }
}
