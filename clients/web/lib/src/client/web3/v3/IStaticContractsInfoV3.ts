import Addresses from '@towns/generated/addresses.json' assert { type: 'json' }

const goerliContractsInfo: IStaticContractsInfoV3 = {
    address: Addresses['5']['townFactory'],
}

const localhostContractsInfo: IStaticContractsInfoV3 = {
    address: Addresses['31337']['townFactory'],
}

const sepoliaContractsInfo: IStaticContractsInfoV3 = {
    address: Addresses['11155111']['townFactory'],
}

export interface IStaticContractsInfoV3 {
    address: string
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
            throw new Error(`Unsupported chainId ${chainId}. Update IStaticContractsInfo.ts`)
    }
}
