import LocalhostTownFactoryAddress from '@towns/generated/dev/addresses/townFactory.json' assert { type: 'json' }
import LocalhostTownOwnerAddress from '@towns/generated/dev/addresses/townOwner.json' assert { type: 'json' }
import LocalhostMockNFTAddress from '@towns/generated/dev/addresses/mockNFT.json' assert { type: 'json' }
import LocalhostMemberAddress from '@towns/generated/dev/addresses/member.json' assert { type: 'json' }
import LocalhostWalletLinkAddress from '@towns/generated/dev/addresses/walletLink.json' assert { type: 'json' }

import BaseSepoliaTownFactoryAddress from '@towns/generated/v3/addresses/townFactory.json' assert { type: 'json' }
import BaseSepoliaTownOwnerAddress from '@towns/generated/v3/addresses/townOwner.json' assert { type: 'json' }
import BaseSepoliaWalletLinkAddress from '@towns/generated/v3/addresses/walletLink.json' assert { type: 'json' }

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
