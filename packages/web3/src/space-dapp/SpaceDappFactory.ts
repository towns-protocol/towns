import { SpaceDapp } from 'space-dapp'
import { ethers } from 'ethers'
import { BaseChainConfig } from '../utils'

export function createSpaceDapp(
    provider: ethers.providers.Provider,
    config: BaseChainConfig,
): SpaceDapp {
    if (provider === undefined) {
        throw new Error('createSpaceDapp() Provider is undefined')
    }
    return new SpaceDapp(config, provider)
}
