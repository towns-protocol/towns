import { withCorsHeaders } from 'worker-common'
import { Env, TokenProviderRequest } from '../types'
import { ChainWalletAssets } from './wallet-assets/walletAssetsModels'
import { hydrateHoldingValues } from './wallet-assets/hydrateHoldingValues'
import { hydrateTokens } from './wallet-assets/hydrateTokens'
import { getBalances } from './wallet-assets/getBalances'

const solanaChains = ['solana-mainnet']
const evmChains = ['8453']

export const getWalletAssets = async (request: TokenProviderRequest, env: Env) => {
    const { query } = request
    const { evmWalletAddress, solanaWalletAddress } = query || {}

    if (!evmWalletAddress && !solanaWalletAddress) {
        return new Response('No wallet address provided', { status: 400 })
    }

    const promises: Promise<ChainWalletAssets>[] = []
    if (evmWalletAddress) {
        promises.push(...evmChains.map((chain) => getBalances(env, evmWalletAddress, chain)))
    }
    if (solanaWalletAddress) {
        promises.push(
            ...solanaChains.map((solanaChain) =>
                getBalances(env, solanaWalletAddress, solanaChain),
            ),
        )
    }
    try {
        const responses = await Promise.all(promises)
        await hydrateTokens(responses, env)
        hydrateHoldingValues(responses)
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
