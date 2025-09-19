import { providers } from 'ethers'
import { TownsConfig } from '../../townsEnv'

export function makeRiverProvider(config: TownsConfig) {
    const river = config.river
    return new providers.StaticJsonRpcProvider(river.rpcUrl, {
        chainId: river.chainConfig.chainId,
        name: `river-${river.chainConfig.chainId}`,
    })
}

export function makeBaseProvider(config: TownsConfig) {
    const base = config.base
    return new providers.StaticJsonRpcProvider(base.rpcUrl, {
        chainId: base.chainConfig.chainId,
        name: `base-${base.chainConfig.chainId}`,
    })
}
