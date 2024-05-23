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
// TODO: remove this, it should be an individual space's address
import BaseSepoliaSpaceContractAddress from '@river-build/generated/deployments/gamma/base/addresses/space.json' assert { type: 'json' }

// Base mainnet addresses
import BaseMainnetSpaceOwnerContractAddress from '@river-build/generated/deployments/omega/base/addresses/spaceOwner.json' assert { type: 'json' }
import BaseMainnetSpaceFactoryContractAddress from '@river-build/generated/deployments/omega/base/addresses/spaceFactory.json' assert { type: 'json' }
// TODO: remove this, it should be an individual space's address
import BaseMainnetSpaceContractAddress from '@river-build/generated/deployments/omega/base/addresses/space.json' assert { type: 'json' }

import { ContractName } from './types'
import { ethers } from 'ethers'

type ContractDetails = {
    address: string
    abi: ethers.ContractInterface | undefined
}

type RequiredContracts = [
    // spaceowner contract
    [typeof ContractName.SpaceOwner, { address: string; abi: ethers.ContractInterface }],
    [typeof ContractName.SpaceFactory, { address: string; abi: ethers.ContractInterface }],
    // wallet link is on space factory
    [typeof ContractName.WalletLink, { address: string; abi: ethers.ContractInterface }],
    // prepay is on space factory
    [typeof ContractName.Prepay, { address: string; abi: ethers.ContractInterface }],
    // TODO: remove this
    [typeof ContractName.Space, { address: string; abi: undefined }],
    // TODO: these all have been pointing to the wrong address. they need to look at a given space's address not the SpaceContract address
    [typeof ContractName.Channels, { address: string; abi: ethers.ContractInterface }],
    [typeof ContractName.Roles, { address: string; abi: ethers.ContractInterface }],
    [typeof ContractName.Banning, { address: string; abi: ethers.ContractInterface }],
    [typeof ContractName.Membership, { address: string; abi: ethers.ContractInterface }],
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
    // Remove
    [
        ContractName.Space,
        { address: BaseSepoliaSpaceContractAddress.address, abi: undefined }, //
    ],
    // change to space address
    [
        ContractName.Channels,
        { address: BaseSepoliaSpaceFactoryContractAddress.address, abi: BaseSepoliaChannelsAbi },
    ],
    // change to space address
    [
        ContractName.Roles,
        { address: BaseSepoliaSpaceFactoryContractAddress.address, abi: BaseSepoliaRolesAbi },
    ],
    // change to space address
    [
        ContractName.Banning,
        { address: BaseSepoliaSpaceContractAddress.address, abi: BaseSepoliaBanningAbi },
    ],
    // change to space address
    [
        ContractName.Membership,
        { address: BaseSepoliaSpaceContractAddress.address, abi: BaseSepoliaMembershipAbi }, //
    ],
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
    // Remove
    [
        ContractName.Space,
        { address: BaseMainnetSpaceContractAddress.address, abi: undefined }, //
    ],
    // change to space address
    [
        ContractName.Channels,
        { address: BaseMainnetSpaceFactoryContractAddress.address, abi: BaseSepoliaChannelsAbi },
    ],
    // change to space address
    [
        ContractName.Roles,
        { address: BaseMainnetSpaceFactoryContractAddress.address, abi: BaseSepoliaRolesAbi },
    ],
    // change to space address
    [
        ContractName.Banning,
        { address: BaseSepoliaSpaceContractAddress.address, abi: BaseSepoliaBanningAbi },
    ],
    // change to space address
    [
        ContractName.Membership,
        { address: BaseSepoliaSpaceContractAddress.address, abi: BaseSepoliaMembershipAbi }, //
    ],
] satisfies RequiredContracts)
