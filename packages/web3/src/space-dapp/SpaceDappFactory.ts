import { ethers } from 'ethers'
import { SpaceDapp } from './SpaceDapp'
import { BaseChainConfig } from '../utils/web3Env'
import { createReadApp } from '../reads'
import { ChainId } from '../reads/clients/get-chain'

export function createSpaceDapp(
    provider: ethers.providers.StaticJsonRpcProvider,
    config: BaseChainConfig,
): SpaceDapp {
    if (provider === undefined) {
        throw new Error('createSpaceDapp() Provider is undefined')
    }
    const app = createReadApp({
        chainId: config.chainId as ChainId,
        url: provider.connection.url,
        spaceFactoryAddress: config.addresses.spaceFactory,
    })
    return new SpaceDapp(config, provider, app)
}
