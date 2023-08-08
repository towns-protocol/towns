/* eslint-disable no-restricted-imports */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import Addresses from '@towns/generated/addresses.json' assert { type: 'json' }

import GoerliTownArchitectAbi from '@towns/generated/goerli/v3/abis/TownArchitect.abi.json' assert { type: 'json' }

import LocalhostTownArchitectAbi from '@towns/generated/localhost/v3/abis/TownArchitect.abi.json' assert { type: 'json' }

import SepoliaTownArchitectAbi from '@towns/generated/sepolia/v3/abis/TownArchitect.abi.json' assert { type: 'json' }

const goerliContractsInfo: IStaticContractsInfoV3 = {
    address: Addresses['5']['townFactory'],
    townArchitect: {
        abi: GoerliTownArchitectAbi,
    },
}

const localhostContractsInfo: IStaticContractsInfoV3 = {
    address: Addresses['31337']['townFactory'],
    townArchitect: {
        abi: LocalhostTownArchitectAbi,
    },
}

const sepoliaContractsInfo: IStaticContractsInfoV3 = {
    address: Addresses['11155111']['townFactory'],
    townArchitect: {
        abi: SepoliaTownArchitectAbi,
    },
}

export interface IStaticContractsInfoV3 {
    address: string
    townArchitect: {
        abi:
            | typeof LocalhostTownArchitectAbi
            | typeof GoerliTownArchitectAbi
            | typeof SepoliaTownArchitectAbi
    }
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
        default:
            throw new Error(`Unsupported chainId ${chainId}. Update ContractsInfo.ts`)
    }
}
