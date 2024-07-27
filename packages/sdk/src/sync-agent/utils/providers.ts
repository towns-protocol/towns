import { providers } from '@0xsequence/multicall'
import { providers as ethersProviders } from 'ethers'
import { RiverConfig } from '../../riverConfig'

export function makeRiverProvider(config: RiverConfig) {
    const river = config.river
    return new providers.MulticallProvider(
        new ethersProviders.StaticJsonRpcProvider(river.rpcUrl, {
            chainId: river.chainConfig.chainId,
            name: `river-${river.chainConfig.chainId}`,
        }),
    )
}

export function makeBaseProvider(config: RiverConfig) {
    const base = config.base
    return new providers.MulticallProvider(
        new ethersProviders.StaticJsonRpcProvider(base.rpcUrl, {
            chainId: base.chainConfig.chainId,
            name: `base-${base.chainConfig.chainId}`,
        }),
    )
}
