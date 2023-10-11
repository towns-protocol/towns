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
import { Address } from 'viem'

export interface IStaticContractsInfoV4 {
    townFactoryAddress: Address
    townOwnerAddress: Address
    mockErc721aAddress: string
    memberTokenAddress: Address
    pioneerTokenAddress: Address
}

const goerliContractsInfo: IStaticContractsInfoV4 = {
    townFactoryAddress: GoerliTownFactoryAddress.address as Address,
    townOwnerAddress: GoerliTownOwnerAddress.address as Address,
    mockErc721aAddress: '',
    memberTokenAddress: GoerliMemberAddress.address as Address,
    pioneerTokenAddress: GoerliPioneerAddress.address as Address,
}

const localhostContractsInfo: IStaticContractsInfoV4 = {
    townFactoryAddress: LocalhostTownFactoryAddress.address as Address,
    townOwnerAddress: LocalhostTownOwnerAddress.address as Address,
    mockErc721aAddress: LocalhostMockNFTAddress.address as Address,
    memberTokenAddress: LocalhostMemberAddress.address as Address,
    pioneerTokenAddress: LocalhostPioneerAddress.address as Address,
}

const sepoliaContractsInfo: IStaticContractsInfoV4 = {
    townFactoryAddress: SepoliaTownFactoryAddress.address as Address,
    townOwnerAddress: SepoliaTownOwnerAddress.address as Address,
    mockErc721aAddress: '',
    memberTokenAddress: SepoliaMemberAddress.address as Address,
    pioneerTokenAddress: SepoliaPioneerAddress.address as Address,
}

/// get contract info for a given chain id
export function getContractsInfoV4(chainId: number): IStaticContractsInfoV4 {
    switch (chainId) {
        case 5:
            return goerliContractsInfo
        case 0:
        case 31337:
            return localhostContractsInfo
        case 11155111:
            return sepoliaContractsInfo
        default:
            throw new Error(`Unsupported chainId ${chainId}. Update IStaticContractsInfo.ts`)
    }
}
