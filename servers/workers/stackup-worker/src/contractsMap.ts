import BaseSepoliaSpaceOwnerAbi from '@river-build/generated/v3/abis/SpaceOwner.abi.json' assert { type: 'json' }
import BaseSepoliaWalletLinkAbi from '@river-build/generated/v3/abis/WalletLink.abi.json' assert { type: 'json' }
import BaseSepoliaSpaceOwnerContract from '@river-build/generated/deployments/gamma/base/addresses/spaceOwner.json' assert { type: 'json' }
import BaseSepoliaBanningAbi from '@river-build/generated/v3/abis/IBanning.abi.json' assert { type: 'json' }
import BaseSepoliaChannelsAbi from '@river-build/generated/v3/abis/Channels.abi.json' assert { type: 'json' }
import BaseSepoliaRolesAbi from '@river-build/generated/v3/abis/Roles.abi.json' assert { type: 'json' }
import BaseSepoliaSpaceFactoryContract from '@river-build/generated/deployments/gamma/base/addresses/spaceFactory.json' assert { type: 'json' }
import BaseSepoliaSpaceContract from '@river-build/generated/deployments/gamma/base/addresses/space.json' assert { type: 'json' }
import BaseSepoliaWalletLinkContract from '@river-build/generated/deployments/gamma/base/addresses/walletLink.json' assert { type: 'json' }
import { ContractName } from './types'
import { ethers } from 'ethers'

type ContractDetails = {
    address: string
    abi: ethers.ContractInterface | undefined
}

export const BaseSepoliaContracts = new Map<keyof typeof ContractName, ContractDetails>([
    [
        ContractName.SpaceOwner,
        { address: BaseSepoliaSpaceOwnerContract.address, abi: BaseSepoliaSpaceOwnerAbi },
    ],
    [
        ContractName.SpaceFactory,
        { address: BaseSepoliaSpaceOwnerContract.address, abi: undefined }, //
    ],
    [
        ContractName.Space,
        { address: BaseSepoliaSpaceContract.address, abi: undefined }, //
    ],
    [
        ContractName.WalletLink,
        { address: BaseSepoliaWalletLinkContract.address, abi: BaseSepoliaWalletLinkAbi },
    ],
    [
        ContractName.Channels,
        { address: BaseSepoliaSpaceFactoryContract.address, abi: BaseSepoliaChannelsAbi },
    ],
    [
        ContractName.Roles,
        { address: BaseSepoliaSpaceFactoryContract.address, abi: BaseSepoliaRolesAbi },
    ],
    [
        ContractName.SpaceFactory,
        { address: BaseSepoliaSpaceFactoryContract.address, abi: BaseSepoliaSpaceOwnerAbi },
    ],
    [
        ContractName.Banning,
        { address: BaseSepoliaSpaceContract.address, abi: BaseSepoliaBanningAbi },
    ],
])
