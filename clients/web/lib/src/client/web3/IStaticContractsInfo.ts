/* eslint-disable no-restricted-imports */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import GoerliCouncilAddress from '@harmony/contracts/goerli/addresses/council.json'
import GoerliCouncilNFTAbi from '@harmony/contracts/goerli/abis/CouncilNFT.abi.json'
import GoerliSpaceFactoryAbi from '@harmony/contracts/goerli/abis/SpaceFactory.abi.json'
import GoerliSpaceFactoryAddress from '@harmony/contracts/goerli/addresses/space-factory.json'
import GoerliZioneerNFTAddress from '@harmony/contracts/goerli/addresses/zioneer.json'
import LocalhostCouncilAddress from '@harmony/contracts/localhost/addresses/council.json'
import LocalhostCouncilNFTAbi from '@harmony/contracts/localhost/abis/CouncilNFT.abi.json'
import LocalhostSpaceFactoryAbi from '@harmony/contracts/localhost/abis/SpaceFactory.abi.json'
import LocalhostSpaceFactoryAddress from '@harmony/contracts/localhost/addresses/space-factory.json'
import LocalhostZioneerNFTAddress from '@harmony/contracts/localhost/addresses/zioneer.json'

const goerliContractsInfo: IStaticContractsInfo = {
    councilNft: {
        abi: GoerliCouncilNFTAbi,
        address: GoerliCouncilAddress,
    },
    spaceFactory: {
        abi: GoerliSpaceFactoryAbi,
        address: GoerliSpaceFactoryAddress,
    },
    zioneerNft: {
        address: GoerliZioneerNFTAddress,
    },
}

const localhostContractsInfo: IStaticContractsInfo = {
    councilNft: {
        abi: LocalhostCouncilNFTAbi,
        address: LocalhostCouncilAddress,
    },
    spaceFactory: {
        abi: LocalhostSpaceFactoryAbi,
        address: LocalhostSpaceFactoryAddress,
    },
    zioneerNft: {
        address: LocalhostZioneerNFTAddress,
    },
}

export interface IStaticContractsInfo {
    councilNft: {
        abi: typeof LocalhostCouncilNFTAbi | typeof GoerliCouncilNFTAbi
        address: typeof LocalhostCouncilAddress | typeof GoerliCouncilAddress
    }
    spaceFactory: {
        abi: typeof LocalhostSpaceFactoryAbi | typeof GoerliSpaceFactoryAbi
        address: typeof LocalhostSpaceFactoryAddress | typeof GoerliSpaceFactoryAddress
    }
    zioneerNft: {
        address: typeof LocalhostZioneerNFTAddress | typeof GoerliZioneerNFTAddress
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
