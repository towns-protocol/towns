import { ethers } from 'ethers'
import { SpaceDapp, SpaceDappCreateStorageFn } from './SpaceDapp'
import { BaseChainConfig } from '../utils/web3Env'

export function createSpaceDapp(
    provider: ethers.providers.Provider,
    config: BaseChainConfig,
    createStorageFn?: SpaceDappCreateStorageFn,
): SpaceDapp {
    if (provider === undefined) {
        throw new Error('createSpaceDapp() Provider is undefined')
    }
    return new SpaceDapp(config, provider, createStorageFn)
}
