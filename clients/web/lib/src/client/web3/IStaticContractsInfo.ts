/* eslint-disable no-restricted-imports */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import GoerliMemberAddress from '@harmony/contracts/goerli/addresses/member.json' assert { type: 'json' }
import GoerliMemberNFTAbi from '@harmony/contracts/goerli/abis/Member.abi.json' assert { type: 'json' }
import GoerliSpaceFactoryAbi from '@harmony/contracts/goerli/abis/SpaceFactory.abi.json' assert { type: 'json' }
import GoerliSpaceFactoryAddresses from '@harmony/contracts/goerli/addresses/space-factory.json' assert { type: 'json' }
import GoerliPioneerNFTAbi from '@harmony/contracts/goerli/abis/Pioneer.abi.json' assert { type: 'json' }
import LocalhostMemberAddress from '@harmony/contracts/localhost/addresses/member.json' assert { type: 'json' }
import LocalhostCouncilNFTAbi from '@harmony/contracts/localhost/abis/Member.abi.json' assert { type: 'json' }
import LocalhostSpaceFactoryAbi from '@harmony/contracts/localhost/abis/SpaceFactory.abi.json' assert { type: 'json' }
import LocalhostSpaceFactoryAddresses from '@harmony/contracts/localhost/addresses/space-factory.json' assert { type: 'json' }
import LocalhostPioneerNFTAbi from '@harmony/contracts/localhost/abis/Pioneer.abi.json' assert { type: 'json' }

const goerliContractsInfo: IStaticContractsInfo = {
    memberNft: {
        abi: GoerliMemberNFTAbi,
        address: GoerliMemberAddress.member,
    },
    spaceFactory: {
        abi: GoerliSpaceFactoryAbi,
        address: GoerliSpaceFactoryAddresses.spaceFactory,
    },
    pioneerNft: {
        abi: GoerliPioneerNFTAbi,
        address: GoerliSpaceFactoryAddresses.pioneerToken,
    },
}

const localhostContractsInfo: IStaticContractsInfo = {
    memberNft: {
        abi: LocalhostCouncilNFTAbi,
        address: LocalhostMemberAddress.member,
    },
    spaceFactory: {
        abi: LocalhostSpaceFactoryAbi,
        address: LocalhostSpaceFactoryAddresses.spaceFactory,
    },
    pioneerNft: {
        abi: LocalhostPioneerNFTAbi,
        address: LocalhostSpaceFactoryAddresses.pioneerToken,
    },
}

export interface IStaticContractsInfo {
    memberNft: {
        abi: typeof LocalhostCouncilNFTAbi | typeof GoerliMemberNFTAbi
        address: typeof LocalhostMemberAddress.member | typeof GoerliMemberAddress.member
    }
    spaceFactory: {
        abi: typeof LocalhostSpaceFactoryAbi | typeof GoerliSpaceFactoryAbi
        address:
            | typeof LocalhostSpaceFactoryAddresses.spaceFactory
            | typeof GoerliSpaceFactoryAddresses.spaceFactory
    }
    pioneerNft: {
        abi: typeof LocalhostPioneerNFTAbi | typeof GoerliPioneerNFTAbi
        address:
            | typeof LocalhostSpaceFactoryAddresses.pioneerToken
            | typeof GoerliSpaceFactoryAddresses.pioneerToken
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
