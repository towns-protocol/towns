import { SpaceAddressFromSpaceId } from '../Utils'
import { IStaticContractsInfo } from '../IStaticContractsInfo'
import { ISpaceArchitectShim } from './ISpaceArchitectShim'
import { Space } from './Space'
import { ethers } from 'ethers'

interface SpaceMap {
    [spaceId: string]: Space
}

/**
 * A class to manage the creation of space stubs
 * converts a space network id to space address and
 * creates a space object with relevant addresses and data
 */
export class SpaceRegistrar {
    private readonly chainId: number
    private readonly provider: ethers.providers.Provider | undefined
    private readonly spaceArchitect: ISpaceArchitectShim
    private readonly spaceOwnerAddress: string
    private readonly spaces: SpaceMap = {}

    constructor(
        contractsInfo: IStaticContractsInfo,
        chainId: number,
        provider: ethers.providers.Provider | undefined,
    ) {
        this.chainId = chainId
        this.provider = provider
        this.spaceOwnerAddress = contractsInfo.spaceOwnerAddress
        this.spaceArchitect = new ISpaceArchitectShim(
            contractsInfo.spaceFactoryAddress,
            chainId,
            provider,
        )
    }

    public get SpaceArchitect(): ISpaceArchitectShim {
        return this.spaceArchitect
    }

    public getSpace(spaceId: string): Space | undefined {
        if (this.spaces[spaceId] === undefined) {
            const spaceAddress = SpaceAddressFromSpaceId(spaceId)
            if (!spaceAddress || spaceAddress === ethers.constants.AddressZero) {
                return undefined // space is not found
            }
            this.spaces[spaceId] = new Space({
                address: spaceAddress,
                spaceId: spaceId,
                spaceOwnerAddress: this.spaceOwnerAddress,
                chainId: this.chainId,
                provider: this.provider,
            })
        }
        return this.spaces[spaceId]
    }
}
