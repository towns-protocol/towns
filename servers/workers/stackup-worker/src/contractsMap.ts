// ABIs - for now shared between mainnet and testnet
import BaseSepoliaBanningAbi from '@river-build/generated/v3/abis/IBanning.abi.json' assert { type: 'json' }
import BaseSepoliaChannelsAbi from '@river-build/generated/v3/abis/Channels.abi.json' assert { type: 'json' }
import BaseSepoliaRolesAbi from '@river-build/generated/v3/abis/Roles.abi.json' assert { type: 'json' }
import BaseSepoliaPrepayAbi from '@river-build/generated/v3/abis/PrepayFacet.abi.json' assert { type: 'json' }
import BaseSepoliaMembershipAbi from '@river-build/generated/v3/abis/MembershipFacet.abi.json' assert { type: 'json' }
import BaseSepoliaSpaceOwnerAbi from '@river-build/generated/v3/abis/SpaceOwner.abi.json' assert { type: 'json' }
import BaseSepoliaWalletLinkAbi from '@river-build/generated/v3/abis/WalletLink.abi.json' assert { type: 'json' }

// Base sepolia addresses
import BaseSepoliaSpaceOwnerContractAddress from '@river-build/generated/deployments/gamma/base/addresses/spaceOwner.json' assert { type: 'json' }
import BaseSepoliaSpaceFactoryContractAddress from '@river-build/generated/deployments/gamma/base/addresses/spaceFactory.json' assert { type: 'json' }

// Base mainnet addresses
import BaseMainnetSpaceOwnerContractAddress from '@river-build/generated/deployments/omega/base/addresses/spaceOwner.json' assert { type: 'json' }
import BaseMainnetSpaceFactoryContractAddress from '@river-build/generated/deployments/omega/base/addresses/spaceFactory.json' assert { type: 'json' }

import { ContractName } from './types'
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

export const BaseSepoliaContracts = new Map<ContractName, ContractDetails>([
    [
        ContractName.SpaceOwner,
        { address: BaseSepoliaSpaceOwnerContractAddress.address, abi: BaseSepoliaSpaceOwnerAbi },
    ],
    [
        ContractName.SpaceFactory,
        { address: BaseSepoliaSpaceFactoryContractAddress.address, abi: BaseSepoliaSpaceOwnerAbi },
    ],
    [
        ContractName.WalletLink,
        { address: BaseSepoliaSpaceFactoryContractAddress.address, abi: BaseSepoliaWalletLinkAbi },
    ],
    [
        ContractName.Prepay,
        { address: BaseSepoliaSpaceFactoryContractAddress.address, abi: BaseSepoliaPrepayAbi }, //
    ],
    // space specific contracts, these addresses are derived during runtime
    [ContractName.Channels, { address: undefined, abi: BaseSepoliaChannelsAbi }],
    [ContractName.Roles, { address: undefined, abi: BaseSepoliaRolesAbi }],
    [ContractName.Banning, { address: undefined, abi: BaseSepoliaBanningAbi }],
    [ContractName.Membership, { address: undefined, abi: BaseSepoliaMembershipAbi }],
] satisfies RequiredContracts)

export const BaseMainnetContracts = new Map<ContractName, ContractDetails>([
    [
        ContractName.SpaceOwner,
        { address: BaseMainnetSpaceOwnerContractAddress.address, abi: BaseSepoliaSpaceOwnerAbi },
    ],
    [
        ContractName.SpaceFactory,
        { address: BaseMainnetSpaceFactoryContractAddress.address, abi: BaseSepoliaSpaceOwnerAbi },
    ],
    [
        ContractName.WalletLink,
        { address: BaseMainnetSpaceFactoryContractAddress.address, abi: BaseSepoliaWalletLinkAbi },
    ],
    [
        ContractName.Prepay,
        { address: BaseMainnetSpaceFactoryContractAddress.address, abi: BaseSepoliaPrepayAbi }, //
    ],
    // space specific contracts, these addresses are derived during runtime
    [ContractName.Channels, { address: undefined, abi: BaseSepoliaChannelsAbi }],
    [ContractName.Roles, { address: undefined, abi: BaseSepoliaRolesAbi }],
    [ContractName.Banning, { address: undefined, abi: BaseSepoliaBanningAbi }],
    [ContractName.Membership, { address: undefined, abi: BaseSepoliaMembershipAbi }],
] satisfies RequiredContracts)
