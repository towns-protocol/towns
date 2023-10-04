import LocalhostTownFactoryAddress from '@towns/generated/localhost/addresses/townFactory.json' assert { type: 'json' }
import LocalhostTownOwnerAddress from '@towns/generated/localhost/addresses/townOwner.json' assert { type: 'json' }
import LocalhostMockNFTAddress from '@towns/generated/localhost/addresses/mockNFT.json' assert { type: 'json' }
import LocalhostMemberAddress from '@towns/generated/localhost/addresses/member.json' assert { type: 'json' }
import LocalhostPioneerAddress from '@towns/generated/localhost/addresses/pioneerToken.json' assert { type: 'json' }

import GoerliTownFactoryAddress from '@towns/generated/goerli/addresses/townFactory.json' assert { type: 'json' }
import GoerliTownOwnerAddress from '@towns/generated/goerli/addresses/townOwner.json' assert { type: 'json' }
import GoerliMemberAddress from '@towns/generated/goerli/addresses/member.json' assert { type: 'json' }
import GoerliPioneerAddress from '@towns/generated/goerli/addresses/pioneerToken.json' assert { type: 'json' }

import SepoliaTownFactoryAddress from '@towns/generated/sepolia/addresses/townFactory.json' assert { type: 'json' }
import SepoliaTownOwnerAddress from '@towns/generated/sepolia/addresses/townOwner.json' assert { type: 'json' }
import SepoliaMemberAddress from '@towns/generated/sepolia/addresses/member.json' assert { type: 'json' }
import SepoliaPioneerAddress from '@towns/generated/sepolia/addresses/pioneerToken.json' assert { type: 'json' }

import BaseGoerliTownFactoryAddress from '@towns/generated/base_goerli/addresses/townFactory.json' assert { type: 'json' }
import BaseGoerliTownOwnerAddress from '@towns/generated/base_goerli/addresses/townOwner.json' assert { type: 'json' }
import BaseGoerliPioneerAddress from '@towns/generated/base_goerli/addresses/pioneerToken.json' assert { type: 'json' }

export interface IStaticContractsInfoV3 {
    townFactoryAddress: string
    townOwnerAddress: string
    mockErc721aAddress: string
    memberTokenAddress?: string
    pioneerTokenAddress: string
}

const goerliContractsInfo: IStaticContractsInfoV3 = {
    townFactoryAddress: GoerliTownFactoryAddress.address,
    townOwnerAddress: GoerliTownOwnerAddress.address,
    mockErc721aAddress: '',
    memberTokenAddress: GoerliMemberAddress.address,
    pioneerTokenAddress: GoerliPioneerAddress.address,
}

const localhostContractsInfo: IStaticContractsInfoV3 = {
    townFactoryAddress: LocalhostTownFactoryAddress.address,
    townOwnerAddress: LocalhostTownOwnerAddress.address,
    mockErc721aAddress: LocalhostMockNFTAddress.address,
    memberTokenAddress: LocalhostMemberAddress.address,
    pioneerTokenAddress: LocalhostPioneerAddress.address,
}

const sepoliaContractsInfo: IStaticContractsInfoV3 = {
    townFactoryAddress: SepoliaTownFactoryAddress.address,
    townOwnerAddress: SepoliaTownOwnerAddress.address,
    mockErc721aAddress: '',
    memberTokenAddress: SepoliaMemberAddress.address,
    pioneerTokenAddress: SepoliaPioneerAddress.address,
}

const baseGoerliContractsInfo: IStaticContractsInfoV3 = {
    townFactoryAddress: BaseGoerliTownFactoryAddress.address,
    townOwnerAddress: BaseGoerliTownOwnerAddress.address,
    mockErc721aAddress: '',
    pioneerTokenAddress: BaseGoerliPioneerAddress.address,
}

/// get contract info for a given chain id
export function getContractsInfoV3(chainId: number): IStaticContractsInfoV3 {
    switch (chainId) {
        case 5:
            return goerliContractsInfo
        case 0:
        case 31337:
            return localhostContractsInfo
        case 11155111:
            return sepoliaContractsInfo
        case 84531:
            return baseGoerliContractsInfo
        default:
            throw new Error(`Unsupported chainId ${chainId}. Update IStaticContractsInfo.ts`)
    }
}
