/* eslint-disable no-restricted-imports */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import Addresses from '@harmony/generated/addresses.json' assert { type: 'json' }
import GoerliMemberNFTAbi from '@harmony/generated/goerli/abis/Member.abi.json' assert { type: 'json' }
import GoerliSpaceFactoryAbi from '@harmony/generated/goerli/abis/SpaceFactory.abi.json' assert { type: 'json' }
import GoerliPioneerNFTAbi from '@harmony/generated/goerli/abis/Pioneer.abi.json' assert { type: 'json' }
import LocalhostCouncilNFTAbi from '@harmony/generated/localhost/abis/Member.abi.json' assert { type: 'json' }
import LocalhostSpaceFactoryAbi from '@harmony/generated/localhost/abis/SpaceFactory.abi.json' assert { type: 'json' }
import LocalhostPioneerNFTAbi from '@harmony/generated/localhost/abis/Pioneer.abi.json' assert { type: 'json' }

const goerliContractsInfo: IStaticContractsInfo = {
    memberNft: {
        abi: GoerliMemberNFTAbi,
        address: Addresses['5']['member'],
    },
    spaceFactory: {
        abi: GoerliSpaceFactoryAbi,
        address: Addresses['5']['spaceFactory'],
    },
    pioneerNft: {
        abi: GoerliPioneerNFTAbi,
        address: Addresses['5']['pioneerToken'],
    },
}

const localhostContractsInfo: IStaticContractsInfo = {
    memberNft: {
        abi: LocalhostCouncilNFTAbi,
        address: Addresses['31337']['member'],
    },
    spaceFactory: {
        abi: LocalhostSpaceFactoryAbi,
        address: Addresses['31337']['spaceFactory'],
    },
    pioneerNft: {
        abi: LocalhostPioneerNFTAbi,
        address: Addresses['31337']['pioneerToken'],
    },
}

export interface IStaticContractsInfo {
    memberNft: {
        abi: typeof LocalhostCouncilNFTAbi | typeof GoerliMemberNFTAbi
        address: (typeof Addresses)['31337']['member'] | (typeof Addresses)[5]['member']
    }
    spaceFactory: {
        abi: typeof LocalhostSpaceFactoryAbi | typeof GoerliSpaceFactoryAbi
        address: (typeof Addresses)['31337']['spaceFactory'] | (typeof Addresses)[5]['spaceFactory']
    }
    pioneerNft: {
        abi: typeof LocalhostPioneerNFTAbi | typeof GoerliPioneerNFTAbi
        address: (typeof Addresses)['31337']['pioneerToken'] | (typeof Addresses)[5]['pioneerToken']
    }
}

/// get contract info for a given chain id
export function getContractsInfo(chainId: number): IStaticContractsInfo {
    switch (chainId) {
        case 5:
            return goerliContractsInfo
        case 0:
        case 31337:
            return localhostContractsInfo
        default:
            throw new Error(`Unsupported chainId ${chainId}. Update ContractsInfo.ts`)
    }
}
