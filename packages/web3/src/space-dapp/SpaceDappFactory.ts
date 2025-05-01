import { ethers } from 'ethers'
import { SpaceDapp } from './SpaceDapp'
import { BaseChainConfig } from '../utils/IStaticContractsInfo'

export function createSpaceDapp(
    provider: ethers.providers.Provider,
    config: BaseChainConfig,
): SpaceDapp {
    if (provider === undefined) {
        throw new Error('createSpaceDapp() Provider is undefined')
    }
    return new SpaceDapp(config, provider)
}
