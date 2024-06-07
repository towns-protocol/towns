import { RiverRegistry } from './v3/RiverRegistry'
import { ethers } from 'ethers'
import { RiverChainConfig } from './IStaticContractsInfo'

export function createRiverRegistry(
    provider: ethers.providers.Provider,
    config: RiverChainConfig,
): RiverRegistry {
    return new RiverRegistry(config, provider)
}
