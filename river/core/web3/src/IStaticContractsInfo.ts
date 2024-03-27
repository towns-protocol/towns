import LocalhostSpaceFactoryAddress from '@river-build/generated/addresses/base_anvil/spaceFactory.json' assert { type: 'json' }
import LocalhostSpaceOwnerAddress from '@river-build/generated/addresses/base_anvil/spaceOwner.json' assert { type: 'json' }
import LocalhostMockNFTAddress from '@river-build/generated/addresses/base_anvil/mockNFT.json' assert { type: 'json' }
import LocalhostMemberAddress from '@river-build/generated/addresses/base_anvil/member.json' assert { type: 'json' }
import LocalhostWalletLinkAddress from '@river-build/generated/addresses/base_anvil/walletLink.json' assert { type: 'json' }
import LocalhostRiverRegistryAddress from '@river-build/generated/addresses/river_anvil/riverRegistry.json' assert { type: 'json' }

import BaseSepoliaSpaceFactoryAddress from '@river-build/generated/addresses/base_sepolia/spaceFactory.json' assert { type: 'json' }
import BaseSepoliaSpaceOwnerAddress from '@river-build/generated/addresses/base_sepolia/spaceOwner.json' assert { type: 'json' }
import BaseSepoliaWalletLinkAddress from '@river-build/generated/addresses/base_sepolia/walletLink.json' assert { type: 'json' }
import RiverChainRiverRegistryAddress from '@river-build/generated/addresses/river/riverRegistry.json' assert { type: 'json' }

import { Address } from './ContractTypes'
export interface IStaticContractsInfo {
    spaceFactoryAddress: Address
    spaceOwnerAddress: Address
    mockErc721aAddress: Address
    testGatingTokenAddress?: Address // For tesing token gating scenarios
    walletLinkAddress: Address
}

export interface IRiverChainContractsInfo {
    riverRegistryAddress: Address
}

const localhostContractsInfo: IStaticContractsInfo = {
    spaceFactoryAddress: LocalhostSpaceFactoryAddress.address as Address,
    spaceOwnerAddress: LocalhostSpaceOwnerAddress.address as Address,
    mockErc721aAddress: LocalhostMockNFTAddress.address as Address,
    testGatingTokenAddress: LocalhostMemberAddress.address as Address,
    walletLinkAddress: LocalhostWalletLinkAddress.address as Address,
}

const localhostRiverChainContractsInfo: IRiverChainContractsInfo = {
    riverRegistryAddress: LocalhostRiverRegistryAddress.address as Address,
}

const baseSepoliaContractsInfo: IStaticContractsInfo = {
    spaceFactoryAddress: BaseSepoliaSpaceFactoryAddress.address as Address,
    spaceOwnerAddress: BaseSepoliaSpaceOwnerAddress.address as Address,
    mockErc721aAddress: '' as Address,
    walletLinkAddress: BaseSepoliaWalletLinkAddress.address as Address,
}

const riverChainContractsInfo: IRiverChainContractsInfo = {
    riverRegistryAddress: RiverChainRiverRegistryAddress.address as Address,
}

/// get contract info for a given chain id
export function getContractsInfo(chainId: number): IStaticContractsInfo {
    switch (chainId) {
        case 0:
        case 31337:
            return localhostContractsInfo
        case 84532:
            return baseSepoliaContractsInfo
        default:
            throw new Error(`Unsupported chainId ${chainId}. Update IStaticContractsInfo.ts`)
    }
}

export function getRiverChainContractsInfo(chainId: number): IRiverChainContractsInfo {
    switch (chainId) {
        case 0:
        case 31338:
            return localhostRiverChainContractsInfo
        case 6524490:
            return riverChainContractsInfo
        default:
            throw new Error(`Unsupported chainId ${chainId}. Update IRiverChainContractsInfo`)
    }
}
