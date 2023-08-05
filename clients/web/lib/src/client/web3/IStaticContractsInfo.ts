/* eslint-disable no-restricted-imports */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import Addresses from '@towns/generated/addresses.json' assert { type: 'json' }

import GoerliMemberNFTAbi from '@towns/generated/goerli/abis/Member.abi.json' assert { type: 'json' }
import GoerliSpaceFactoryAbi from '@towns/generated/goerli/abis/SpaceFactory.abi.json' assert { type: 'json' }
import GoerliPioneerNFTAbi from '@towns/generated/goerli/abis/Pioneer.abi.json' assert { type: 'json' }

import LocalhostMemberNFTAbi from '@towns/generated/localhost/abis/Member.abi.json' assert { type: 'json' }
import LocalhostSpaceFactoryAbi from '@towns/generated/localhost/abis/SpaceFactory.abi.json' assert { type: 'json' }
import LocalhostPioneerNFTAbi from '@towns/generated/localhost/abis/Pioneer.abi.json' assert { type: 'json' }

import SepoliaMemberNFTAbi from '@towns/generated/sepolia/abis/Member.abi.json' assert { type: 'json' }
import SepoliaSpaceFactoryAbi from '@towns/generated/sepolia/abis/SpaceFactory.abi.json' assert { type: 'json' }
import SepoliaPioneerNFTAbi from '@towns/generated/sepolia/abis/Pioneer.abi.json' assert { type: 'json' }

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
        abi: LocalhostMemberNFTAbi,
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

const sepoliaContractsInfo: IStaticContractsInfo = {
    memberNft: {
        abi: SepoliaMemberNFTAbi,
        address: Addresses['11155111']['member'],
    },
    spaceFactory: {
        abi: SepoliaSpaceFactoryAbi,
        address: Addresses['11155111']['spaceFactory'],
    },
    pioneerNft: {
        abi: SepoliaPioneerNFTAbi,
        address: Addresses['11155111']['pioneerToken'],
    },
}

export interface IStaticContractsInfo {
    memberNft: {
        abi: typeof LocalhostMemberNFTAbi | typeof GoerliMemberNFTAbi | typeof SepoliaMemberNFTAbi
        address: string
    }
    spaceFactory: {
        abi:
            | typeof LocalhostSpaceFactoryAbi
            | typeof GoerliSpaceFactoryAbi
            | typeof SepoliaSpaceFactoryAbi
        address: string
    }
    pioneerNft: {
        abi:
            | typeof LocalhostPioneerNFTAbi
            | typeof GoerliPioneerNFTAbi
            | typeof SepoliaPioneerNFTAbi
        address: string
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
        case 11155111:
            return sepoliaContractsInfo
        default:
            throw new Error(`Unsupported chainId ${chainId}. Update ContractsInfo.ts`)
    }
}
