import { SpaceDapp } from './v3'
import { ISpaceDapp } from './ISpaceDapp'
import { ethers } from 'ethers'
import { BaseChainConfig } from './IStaticContractsInfo'

export function createSpaceDapp(
    provider: ethers.providers.Provider,
    config: BaseChainConfig,
): ISpaceDapp {
    if (provider === undefined) {
        throw new Error('createSpaceDapp() Provider is undefined')
    }
    return new SpaceDapp(config, provider)
}
