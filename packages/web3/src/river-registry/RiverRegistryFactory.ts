import { RiverRegistry } from './RiverRegistry'
import { ethers } from 'ethers'
import { RiverChainConfig } from '../utils/IStaticContractsInfo'

export function createRiverRegistry(
    provider: ethers.providers.Provider,
    config: RiverChainConfig,
): RiverRegistry {
    return new RiverRegistry(config, provider)
}
