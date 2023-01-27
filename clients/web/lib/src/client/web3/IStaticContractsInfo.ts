/* eslint-disable no-restricted-imports */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */

import GoerliCouncilAddress from '@harmony/contracts/goerli/addresses/council.json' assert { type: 'json' }
import GoerliCouncilNFTAbi from '@harmony/contracts/goerli/abis/CouncilNFT.abi.json' assert { type: 'json' }
import GoerliSpaceFactoryAbi from '@harmony/contracts/goerli/abis/SpaceFactory.abi.json' assert { type: 'json' }
import GoerliSpaceFactoryAddress from '@harmony/contracts/goerli/addresses/space-factory.json' assert { type: 'json' }
import GoerliZioneerNFTAddress from '@harmony/contracts/goerli/addresses/zioneer.json' assert { type: 'json' }
import GoerliZioneerNFTAbi from '@harmony/contracts/goerli/abis/Zioneer.abi.json' assert { type: 'json' }
import LocalhostCouncilAddress from '@harmony/contracts/localhost/addresses/council.json' assert { type: 'json' }
import LocalhostCouncilNFTAbi from '@harmony/contracts/localhost/abis/CouncilNFT.abi.json' assert { type: 'json' }
import LocalhostSpaceFactoryAbi from '@harmony/contracts/localhost/abis/SpaceFactory.abi.json' assert { type: 'json' }
import LocalhostSpaceFactoryAddress from '@harmony/contracts/localhost/addresses/space-factory.json' assert { type: 'json' }
import LocalhostZioneerNFTAddress from '@harmony/contracts/localhost/addresses/zioneer.json' assert { type: 'json' }
import LocalhostZioneerNFTAbi from '@harmony/contracts/localhost/abis/Zioneer.abi.json' assert { type: 'json' }

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
        abi: GoerliZioneerNFTAbi,
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
        abi: LocalhostZioneerNFTAbi,
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
        abi: typeof LocalhostZioneerNFTAbi | typeof GoerliZioneerNFTAbi
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
