import { SpaceAddressFromSpaceId } from '../Utils'
import { BaseChainConfig } from '../IStaticContractsInfo'
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
    public readonly config: BaseChainConfig
    private readonly provider: ethers.providers.Provider | undefined
    private readonly spaceArchitect: ISpaceArchitectShim
    private readonly spaceOwnerAddress: string
    private readonly spaces: SpaceMap = {}

    constructor(config: BaseChainConfig, provider: ethers.providers.Provider | undefined) {
        this.config = config
        this.provider = provider
        this.spaceOwnerAddress = this.config.addresses.spaceOwner
        this.spaceArchitect = new ISpaceArchitectShim(
            config.addresses.spaceFactory,
            config.contractVersion,
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
                version: this.config.contractVersion,
                provider: this.provider,
            })
        }
        return this.spaces[spaceId]
    }
}
