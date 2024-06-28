// ABIs - for now shared between mainnet and testnet
import BanningAbi from '@river-build/generated/dev/abis/IBanning.abi.json' assert { type: 'json' }
import ChannelsAbi from '@river-build/generated/dev/abis/Channels.abi.json' assert { type: 'json' }
import RolesAbi from '@river-build/generated/dev/abis/Roles.abi.json' assert { type: 'json' }
import PrepayAbi from '@river-build/generated/dev/abis/PrepayFacet.abi.json' assert { type: 'json' }
import MembershipAbi from '@river-build/generated/dev/abis/MembershipFacet.abi.json' assert { type: 'json' }
import SpaceOwnerAbi from '@river-build/generated/dev/abis/SpaceOwner.abi.json' assert { type: 'json' }
import WalletLinkAbi from '@river-build/generated/dev/abis/WalletLink.abi.json' assert { type: 'json' }

// Dev addresses
import LocalhostSpaceOwnerContractAddress from '@river-build/generated/deployments/gamma/base/addresses/spaceOwner.json' assert { type: 'json' }
import LocalhostSpaceFactoryContractAddress from '@river-build/generated/deployments/gamma/base/addresses/spaceFactory.json' assert { type: 'json' }

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

export const LocalhostContracts = new Map<ContractName, ContractDetails>([
    [
        ContractName.SpaceOwner,
        { address: LocalhostSpaceOwnerContractAddress.address, abi: SpaceOwnerAbi },
    ],
    [
        ContractName.SpaceFactory,
        { address: LocalhostSpaceFactoryContractAddress.address, abi: SpaceOwnerAbi },
    ],
    [
        ContractName.WalletLink,
        { address: LocalhostSpaceFactoryContractAddress.address, abi: WalletLinkAbi },
    ],
    [
        ContractName.Prepay,
        { address: LocalhostSpaceFactoryContractAddress.address, abi: PrepayAbi }, //
    ],
    // space specific contracts, these addresses are derived during runtime
    [ContractName.Channels, { address: undefined, abi: ChannelsAbi }],
    [ContractName.Roles, { address: undefined, abi: RolesAbi }],
    [ContractName.Banning, { address: undefined, abi: BanningAbi }],
    [ContractName.Membership, { address: undefined, abi: MembershipAbi }],
] satisfies RequiredContracts)

export const BaseSepoliaContracts = new Map<ContractName, ContractDetails>([
    [
        ContractName.SpaceOwner,
        { address: BaseSepoliaSpaceOwnerContractAddress.address, abi: SpaceOwnerAbi },
    ],
    [
        ContractName.SpaceFactory,
        { address: BaseSepoliaSpaceFactoryContractAddress.address, abi: SpaceOwnerAbi },
    ],
    [
        ContractName.WalletLink,
        { address: BaseSepoliaSpaceFactoryContractAddress.address, abi: WalletLinkAbi },
    ],
    [
        ContractName.Prepay,
        { address: BaseSepoliaSpaceFactoryContractAddress.address, abi: PrepayAbi }, //
    ],
    // space specific contracts, these addresses are derived during runtime
    [ContractName.Channels, { address: undefined, abi: ChannelsAbi }],
    [ContractName.Roles, { address: undefined, abi: RolesAbi }],
    [ContractName.Banning, { address: undefined, abi: BanningAbi }],
    [ContractName.Membership, { address: undefined, abi: MembershipAbi }],
] satisfies RequiredContracts)

export const BaseMainnetContracts = new Map<ContractName, ContractDetails>([
    [
        ContractName.SpaceOwner,
        { address: BaseMainnetSpaceOwnerContractAddress.address, abi: SpaceOwnerAbi },
    ],
    [
        ContractName.SpaceFactory,
        { address: BaseMainnetSpaceFactoryContractAddress.address, abi: SpaceOwnerAbi },
    ],
    [
        ContractName.WalletLink,
        { address: BaseMainnetSpaceFactoryContractAddress.address, abi: WalletLinkAbi },
    ],
    [
        ContractName.Prepay,
        { address: BaseMainnetSpaceFactoryContractAddress.address, abi: PrepayAbi }, //
    ],
    // space specific contracts, these addresses are derived during runtime
    [ContractName.Channels, { address: undefined, abi: ChannelsAbi }],
    [ContractName.Roles, { address: undefined, abi: RolesAbi }],
    [ContractName.Banning, { address: undefined, abi: BanningAbi }],
    [ContractName.Membership, { address: undefined, abi: MembershipAbi }],
] satisfies RequiredContracts)
