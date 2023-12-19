import LocalhostTownFactoryAddress from '@towns/generated/localhost/addresses/townFactory.json' assert { type: 'json' }
import LocalhostTownOwnerAddress from '@towns/generated/localhost/addresses/townOwner.json' assert { type: 'json' }
import LocalhostMockNFTAddress from '@towns/generated/localhost/addresses/mockNFT.json' assert { type: 'json' }
import LocalhostMemberAddress from '@towns/generated/localhost/addresses/member.json' assert { type: 'json' }
import LocalhostWalletLinkAddress from '@towns/generated/localhost/addresses/walletLink.json' assert { type: 'json' }

import BaseGoerliTownFactoryAddress from '@towns/generated/base_goerli/addresses/townFactory.json' assert { type: 'json' }
import BaseGoerliTownOwnerAddress from '@towns/generated/base_goerli/addresses/townOwner.json' assert { type: 'json' }
import BaseGoerliWalletLinkAddress from '@towns/generated/base_goerli/addresses/walletLink.json' assert { type: 'json' }

import BaseSepoliaTownFactoryAddress from '@towns/generated/base_sepolia/addresses/townFactory.json' assert { type: 'json' }
import BaseSepoliaTownOwnerAddress from '@towns/generated/base_sepolia/addresses/townOwner.json' assert { type: 'json' }
import BaseSepoliaWalletLinkAddress from '@towns/generated/base_sepolia/addresses/walletLink.json' assert { type: 'json' }

import { Address } from 'viem'

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

const baseGoerliContractsInfo: IStaticContractsInfo = {
    townFactoryAddress: BaseGoerliTownFactoryAddress.address as Address,
    townOwnerAddress: BaseGoerliTownOwnerAddress.address as Address,
    mockErc721aAddress: '' as Address,
    walletLinkAddress: BaseGoerliWalletLinkAddress.address as Address,
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
        case 84531:
            return baseGoerliContractsInfo
        case 84532:
            return baseSepoliaContractsInfo
        default:
            throw new Error(`Unsupported chainId ${chainId}. Update IStaticContractsInfo.ts`)
    }
}
