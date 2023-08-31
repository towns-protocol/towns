import Addresses from '@towns/generated/addresses.json' assert { type: 'json' }

export interface IStaticContractsInfoV3 {
    townFactoryAddress: string
    townOwnerAddress: string
    mockErc721aAddress: string
    memberTokenAddress: string
    pioneerTokenAddress: string
}

const goerliContractsInfo: IStaticContractsInfoV3 = {
    townFactoryAddress: Addresses['5']['townFactory'],
    townOwnerAddress: Addresses['5']['townOwner'],
    mockErc721aAddress: '',
    memberTokenAddress: Addresses['5']['member'],
    pioneerTokenAddress: Addresses['5']['pioneerToken'],
}

const localhostContractsInfo: IStaticContractsInfoV3 = {
    townFactoryAddress: Addresses['31337']['townFactory'],
    townOwnerAddress: Addresses['31337']['townOwner'],
    mockErc721aAddress: Addresses['31337']['mockNFT'],
    memberTokenAddress: Addresses['31337']['member'],
    pioneerTokenAddress: Addresses['31337']['pioneerToken'],
}

const sepoliaContractsInfo: IStaticContractsInfoV3 = {
    townFactoryAddress: Addresses['11155111']['townFactory'],
    townOwnerAddress: Addresses['11155111']['townOwner'],
    mockErc721aAddress: '',
    memberTokenAddress: Addresses['11155111']['member'],
    pioneerTokenAddress: Addresses['11155111']['pioneerToken'],
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
