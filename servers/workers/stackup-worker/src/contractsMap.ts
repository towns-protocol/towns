import BanningAbi from '@river-build/generated/dev/abis/IBanning.abi.json' assert { type: 'json' }
import ChannelsAbi from '@river-build/generated/dev/abis/Channels.abi.json' assert { type: 'json' }
import RolesAbi from '@river-build/generated/dev/abis/Roles.abi.json' assert { type: 'json' }
import PrepayAbi from '@river-build/generated/dev/abis/PrepayFacet.abi.json' assert { type: 'json' }
import MembershipAbi from '@river-build/generated/dev/abis/MembershipFacet.abi.json' assert { type: 'json' }
import SpaceOwnerAbi from '@river-build/generated/dev/abis/SpaceOwner.abi.json' assert { type: 'json' }
import WalletLinkAbi from '@river-build/generated/dev/abis/WalletLink.abi.json' assert { type: 'json' }

import { ContractName, Networks } from './types'
import { ethers } from 'ethers'

type ContractDetails = {
    address: string | undefined
    abi: ethers.ContractInterface
}

export const spaceSpecificContracts = [
    ContractName.Channels,
    ContractName.Roles,
    ContractName.Banning,
    ContractName.Membership,
] as const

export function isSpaceSpecificContract(
    contractName: ContractName,
): contractName is (typeof spaceSpecificContracts)[number] {
    return spaceSpecificContracts.includes(contractName as (typeof spaceSpecificContracts)[number])
}

type RequiredContracts = [
    // spaceowner contract
    [typeof ContractName.SpaceOwner, { address: string; abi: ethers.ContractInterface }],
    [typeof ContractName.SpaceFactory, { address: string; abi: ethers.ContractInterface }],
    // wallet link is on space factory
    [typeof ContractName.WalletLink, { address: string; abi: ethers.ContractInterface }],
    // prepay is on space factory
    [typeof ContractName.Prepay, { address: string; abi: ethers.ContractInterface }],
    // TODO: these all have been pointing to the wrong address. they need to look at a given space's address not the SpaceContract address
    [typeof ContractName.Channels, { address: undefined; abi: ethers.ContractInterface }],
    [typeof ContractName.Roles, { address: undefined; abi: ethers.ContractInterface }],
    [typeof ContractName.Banning, { address: undefined; abi: ethers.ContractInterface }],
    [typeof ContractName.Membership, { address: undefined; abi: ethers.ContractInterface }],
]

/**
 * Dynamically load contract addresses based on the network
 * We must import() these addresses b/c for local dev we want to use local addresses, which are not checked in and available for deployed workers
 */
export const createContractMap = async (
    network: Networks,
): Promise<Map<ContractName, ContractDetails> | null> => {
    let spaceOwner = null
    let spaceFactory = null

    if (network === 'base_sepolia') {
        try {
            spaceOwner = await import(
                '@river-build/generated/deployments/gamma/base/addresses/spaceOwner.json',
                {
                    assert: { type: 'json' },
                }
            )
            spaceFactory = await import(
                '@river-build/generated/deployments/gamma/base/addresses/spaceFactory.json',
                {
                    assert: { type: 'json' },
                }
            )
        } catch (error) {
            console.error('createContractMap: error loading contracts for base_sepolia', error)
        }
    } else if (network === 'base') {
        try {
            spaceOwner = await import(
                '@river-build/generated/deployments/omega/base/addresses/spaceOwner.json',
                {
                    assert: { type: 'json' },
                }
            )
            spaceFactory = await import(
                '@river-build/generated/deployments/omega/base/addresses/spaceFactory.json',
                {
                    assert: { type: 'json' },
                }
            )
        } catch (error) {
            console.error('createContractMap: error loading contracts for base', error)
        }
    } else {
        // TODO: better way to determine which path to import from based on local env
        // these paths are only used for logFilters, which are used for limiting the max sponsored txs per user per day
        // so don't really impact local development unless you're specifically testing that feature
        // the pitfall here would be if a dev has both of these deployments in their local environment
        try {
            spaceOwner = await import(
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                '@river-build/generated/deployments/local_single/base/addresses/spaceOwner.json',
                {
                    assert: { type: 'json' },
                }
            )
            spaceFactory = await import(
                // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                // @ts-ignore
                '@river-build/generated/deployments/local_single/base/addresses/spaceFactory.json',
                {
                    assert: { type: 'json' },
                }
            )
        } catch (error) {
            console.error('createContractMap: error loading contracts for local_single', error)
        }

        if (!spaceOwner || !spaceFactory) {
            try {
                spaceOwner = await import(
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    '@river-build/generated/deployments/local_multi/base/addresses/spaceOwner.json',
                    {
                        assert: { type: 'json' },
                    }
                )
                spaceFactory = await import(
                    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                    // @ts-ignore
                    '@river-build/generated/deployments/local_multi/base/addresses/spaceFactory.json',
                    {
                        assert: { type: 'json' },
                    }
                )
            } catch (error) {
                console.error('createContractMap: error loading contracts for local_multi', error)
            }
        }
    }

    if (!spaceOwner || !spaceFactory) {
        return null
    }

    return new Map<ContractName, ContractDetails>([
        [ContractName.SpaceOwner, { address: spaceOwner.address, abi: SpaceOwnerAbi }],
        [ContractName.SpaceFactory, { address: spaceFactory.address, abi: SpaceOwnerAbi }],
        [ContractName.WalletLink, { address: spaceFactory.address, abi: WalletLinkAbi }],
        [ContractName.Prepay, { address: spaceFactory.address, abi: PrepayAbi }],
        [ContractName.Channels, { address: undefined, abi: ChannelsAbi }],
        [ContractName.Roles, { address: undefined, abi: RolesAbi }],
        [ContractName.Banning, { address: undefined, abi: BanningAbi }],
        [ContractName.Membership, { address: undefined, abi: MembershipAbi }],
    ] satisfies RequiredContracts)
}
