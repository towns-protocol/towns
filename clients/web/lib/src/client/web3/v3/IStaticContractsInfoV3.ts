/* eslint-disable no-restricted-imports */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import Addresses from '@towns/generated/addresses.json' assert { type: 'json' }

import GoerliTownFactoryAbi from '@towns/generated/goerli/v3/abis/TownFactory.abi.json' assert { type: 'json' }

import LocalhostTownFactoryAbi from '@towns/generated/localhost/v3/abis/TownFactory.abi.json' assert { type: 'json' }

import SepoliaTownFactoryAbi from '@towns/generated/sepolia/v3/abis/TownFactory.abi.json' assert { type: 'json' }

const goerliContractsInfo: IStaticContractsInfoV3 = {
    townFactory: {
        abi: GoerliTownFactoryAbi,
        address: Addresses['5']['townFactory'],
    },
}

const localhostContractsInfo: IStaticContractsInfoV3 = {
    townFactory: {
        abi: LocalhostTownFactoryAbi,
        address: Addresses['31337']['townFactory'],
    },
}

const sepoliaContractsInfo: IStaticContractsInfoV3 = {
    townFactory: {
        abi: SepoliaTownFactoryAbi,
        address: Addresses['11155111']['townFactory'],
    },
}

export interface IStaticContractsInfoV3 {
    townFactory: {
        abi:
            | typeof LocalhostTownFactoryAbi
            | typeof GoerliTownFactoryAbi
            | typeof SepoliaTownFactoryAbi
        address: string
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
