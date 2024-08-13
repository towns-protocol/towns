import { SpaceAddressFromSpaceId } from '../Utils'
import { BaseChainConfig } from '../IStaticContractsInfo'
import { ISpaceArchitectShim } from './ISpaceArchitectShim'
import { ILegacySpaceArchitectShim } from './ILegacySpaceArchitectShim'

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
    private readonly provider: ethers.providers.Provider
    private readonly spaceArchitect: ISpaceArchitectShim
    private readonly legacySpaceArchitect: ILegacySpaceArchitectShim
    private readonly spaces: SpaceMap = {}

    constructor(config: BaseChainConfig, provider: ethers.providers.Provider) {
        this.config = config
        this.provider = provider
        this.spaceArchitect = new ISpaceArchitectShim(config.addresses.spaceFactory, provider)
        this.legacySpaceArchitect = new ILegacySpaceArchitectShim(
            config.addresses.spaceFactory,
            provider,
        )
    }

    public get SpaceArchitect(): ISpaceArchitectShim {
        return this.spaceArchitect
    }

    public get LegacySpaceArchitect(): ILegacySpaceArchitectShim {
        return this.legacySpaceArchitect
    }

    public getSpace(spaceId: string): Space | undefined {
        if (this.spaces[spaceId] === undefined) {
            const spaceAddress = SpaceAddressFromSpaceId(spaceId)
            if (!spaceAddress || spaceAddress === ethers.constants.AddressZero) {
                return undefined // space is not found
            }
            this.spaces[spaceId] = new Space(spaceAddress, spaceId, this.config, this.provider)
        }
        return this.spaces[spaceId]
    }
}
