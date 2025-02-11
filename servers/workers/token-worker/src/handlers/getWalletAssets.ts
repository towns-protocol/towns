import { withCorsHeaders } from 'worker-common'
import { Env, TokenProviderRequest } from '../types'
import { getEvmWalletAssets } from './wallet-assets/getEvmWalletAssets'
import { tokenNetworkMap } from '../utils'
import { hydrateNativeTokenPrices } from './wallet-assets/hydrateNativeTokenPrices'
import { getSolanaWalletAssets } from './wallet-assets/getSolanaWalletAssets'
import { ChainWalletAssets } from './wallet-assets/walletAssetsModels'
import { hydrateHoldingValues } from './wallet-assets/hydrateHoldingValues'

// filter out chains that are available on coingecko
// currently this only filters out base sepolia (not supported by coingecko)
const evmChains = tokenNetworkMap.filter((x) => x.alchemyIdentifier === 'base-mainnet')
const solanaChains = ['solana-mainnet']

export const getWalletAssets = async (request: TokenProviderRequest, env: Env) => {
    const { query } = request
    const { evmWalletAddress, solanaWalletAddress } = query || {}

    const promises: Promise<ChainWalletAssets>[] = []
    if (evmWalletAddress) {
        promises.push(
            ...evmChains.map((chain) =>
                getEvmWalletAssets(
                    evmWalletAddress,
                    chain.vChain.rpcUrls.alchemy.http[0],
                    chain.simpleHashIdentifier,
                    chain.coinGeckoIdentifier,
                    env,
                ),
            ),
        )
    }
    if (solanaWalletAddress) {
        promises.push(
            ...solanaChains.map((solanaChain) =>
                getSolanaWalletAssets(solanaChain, solanaWalletAddress, env),
            ),
        )
    }
    try {
        const responses = await Promise.all(promises)
        await hydrateNativeTokenPrices(responses, env)
        await hydrateHoldingValues(responses)
        const body = JSON.stringify(responses)
        const headers = {
            'Content-type': 'application/json',
            ...withCorsHeaders(request, env.ENVIRONMENT),
        }
        return new Response(body, { headers })
    } catch (error) {
        console.error('Error getting wallet assets', error)
        return new Response('Error getting wallet assets', { status: 500 })
    }
}
