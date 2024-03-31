import { Chain } from 'viem/chains'
import { TProvider, IChainConfig } from '../types/web3-types'
import { ethers } from 'ethers'

export function makeProviderFromChain(chain: Chain): TProvider {
    const rpcUrl = chain.rpcUrls.default.http[0]
    return new ethers.providers.StaticJsonRpcProvider(rpcUrl, {
        chainId: chain.id,
        name: chain.name,
    })
}

export function makeProviderFromConfig(chain: IChainConfig): TProvider {
    return new ethers.providers.StaticJsonRpcProvider(chain.rpcUrl, {
        chainId: chain.chainId,
        name: chain?.name ?? '',
    })
}
