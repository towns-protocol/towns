import { Drop } from './v3/Drop'
import { BaseChainConfig } from './IStaticContractsInfo'
import { ethers } from 'ethers'

export function createDrop(config: BaseChainConfig, provider: ethers.providers.Provider): Drop {
    return new Drop(config, provider)
}
