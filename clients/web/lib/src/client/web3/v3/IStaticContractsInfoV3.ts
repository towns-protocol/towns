import Addresses from '@towns/generated/addresses.json' assert { type: 'json' }

const goerliContractsInfo: IStaticContractsInfoV3 = {
    townFactoryAddress: Addresses['5']['townFactory'],
    townOwnerAddress: Addresses['5']['townOwner'],
}

const localhostContractsInfo: IStaticContractsInfoV3 = {
    townFactoryAddress: Addresses['31337']['townFactory'],
    townOwnerAddress: Addresses['31337']['townOwner'],
}

const sepoliaContractsInfo: IStaticContractsInfoV3 = {
    townFactoryAddress: Addresses['11155111']['townFactory'],
    townOwnerAddress: Addresses['11155111']['townOwner'],
}

export interface IStaticContractsInfoV3 {
    townFactoryAddress: string
    townOwnerAddress: string
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
