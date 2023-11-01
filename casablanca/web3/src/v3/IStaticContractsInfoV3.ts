import LocalhostTownFactoryAddress from '@towns/generated/localhost/addresses/townFactory.json' assert { type: 'json' }
import LocalhostTownOwnerAddress from '@towns/generated/localhost/addresses/townOwner.json' assert { type: 'json' }
import LocalhostMockNFTAddress from '@towns/generated/localhost/addresses/mockNFT.json' assert { type: 'json' }
import LocalhostMemberAddress from '@towns/generated/localhost/addresses/member.json' assert { type: 'json' }
import LocalhostPioneerAddress from '@towns/generated/localhost/addresses/pioneerToken.json' assert { type: 'json' }
import WalletLinkAddress from '@towns/generated/localhost/addresses/walletLink.json' assert { type: 'json' }

import BaseGoerliTownFactoryAddress from '@towns/generated/base_goerli/addresses/townFactory.json' assert { type: 'json' }
import BaseGoerliTownOwnerAddress from '@towns/generated/base_goerli/addresses/townOwner.json' assert { type: 'json' }
import BaseGoerliPioneerAddress from '@towns/generated/base_goerli/addresses/pioneerToken.json' assert { type: 'json' }

export interface IStaticContractsInfoV3 {
    townFactoryAddress: string
    townOwnerAddress: string
    mockErc721aAddress: string
    memberTokenAddress?: string
    pioneerTokenAddress: string
    walletLinkAddress: string
}

const localhostContractsInfo: IStaticContractsInfoV3 = {
    townFactoryAddress: LocalhostTownFactoryAddress.address,
    townOwnerAddress: LocalhostTownOwnerAddress.address,
    mockErc721aAddress: LocalhostMockNFTAddress.address,
    memberTokenAddress: LocalhostMemberAddress.address,
    pioneerTokenAddress: LocalhostPioneerAddress.address,
    walletLinkAddress: WalletLinkAddress.address,
}

const baseGoerliContractsInfo: IStaticContractsInfoV3 = {
    townFactoryAddress: BaseGoerliTownFactoryAddress.address,
    townOwnerAddress: BaseGoerliTownOwnerAddress.address,
    mockErc721aAddress: '',
    pioneerTokenAddress: BaseGoerliPioneerAddress.address,
    walletLinkAddress: WalletLinkAddress.address,
}

/// get contract info for a given chain id
export function getContractsInfoV3(chainId: number): IStaticContractsInfoV3 {
    switch (chainId) {
        case 0:
        case 31337:
            return localhostContractsInfo
        case 84531:
            return baseGoerliContractsInfo
        default:
            throw new Error(`Unsupported chainId ${chainId}. Update IStaticContractsInfo.ts`)
    }
}
