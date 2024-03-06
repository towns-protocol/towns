import LocalhostTownFactoryAddress from '@river/generated/addresses/base_anvil/spaceFactory.json' assert { type: 'json' }
import LocalhostTownOwnerAddress from '@river/generated/addresses/base_anvil/spaceOwner.json' assert { type: 'json' }
import LocalhostMockNFTAddress from '@river/generated/addresses/base_anvil/mockNFT.json' assert { type: 'json' }
import LocalhostMemberAddress from '@river/generated/addresses/base_anvil/member.json' assert { type: 'json' }
import LocalhostWalletLinkAddress from '@river/generated/addresses/base_anvil/walletLink.json' assert { type: 'json' }

import BaseSepoliaTownFactoryAddress from '@river/generated/addresses/base_sepolia/spaceFactory.json' assert { type: 'json' }
import BaseSepoliaTownOwnerAddress from '@river/generated/addresses/base_sepolia/spaceOwner.json' assert { type: 'json' }
import BaseSepoliaWalletLinkAddress from '@river/generated/addresses/base_sepolia/walletLink.json' assert { type: 'json' }

import { Address } from './ContractTypes'
export interface IStaticContractsInfo {
    townFactoryAddress: Address
    townOwnerAddress: Address
    mockErc721aAddress: Address
    testGatingTokenAddress?: Address // For tesing token gating scenarios
    walletLinkAddress: Address
}

const localhostContractsInfo: IStaticContractsInfo = {
    townFactoryAddress: LocalhostTownFactoryAddress.address as Address,
    townOwnerAddress: LocalhostTownOwnerAddress.address as Address,
    mockErc721aAddress: LocalhostMockNFTAddress.address as Address,
    testGatingTokenAddress: LocalhostMemberAddress.address as Address,
    walletLinkAddress: LocalhostWalletLinkAddress.address as Address,
}

const baseSepoliaContractsInfo: IStaticContractsInfo = {
    townFactoryAddress: BaseSepoliaTownFactoryAddress.address as Address,
    townOwnerAddress: BaseSepoliaTownOwnerAddress.address as Address,
    mockErc721aAddress: '' as Address,
    walletLinkAddress: BaseSepoliaWalletLinkAddress.address as Address,
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
