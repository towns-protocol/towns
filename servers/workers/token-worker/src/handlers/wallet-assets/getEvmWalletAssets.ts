import { Env } from '../../types'
import { alchemyRpcCall } from './assetsHelpers'
import { hydrateWalletAssets } from './hydrateWalletAssets'
import { ChainWalletAssets, TokenAsset, NativeAsset } from './walletAssetsModels'

interface AlchemyTokenBalance {
    contractAddress: string
    tokenBalance: string
}

interface AlchemyTokenBalancesResponse {
    result: {
        address: string
        tokenBalances: AlchemyTokenBalance[]
    }
}

interface AlchemyNativeBalanceResponse {
    result: string
}

export async function getEvmWalletAssets(
    walletAddress: string,
    alchemyRpcUrl: string,
    chain: string,
    coinGeckoIdentifier: string,
    env: Env,
): Promise<ChainWalletAssets> {
    const apiKey = env.ALCHEMY_API_KEY
    const rpcUrl = `${alchemyRpcUrl}/${apiKey}`

    try {
        // 1. Fetch token balances from Alchemy.
        const tokenData = await alchemyRpcCall<AlchemyTokenBalancesResponse>(
            rpcUrl,
            'alchemy_getTokenBalances',
            [walletAddress, 'erc20'],
        )

        const tokens: TokenAsset[] = tokenData.result.tokenBalances
            .map((token) => ({
                chain,
                tokenAddress: token.contractAddress,
                symbol: '',
                balance: token.tokenBalance,
                decimals: 0,
                imageUrl: '',
                name: '',
                priceCents: 0,
                priceChange24h: 0,
                holdingValueCents: 0,
            }))
            .filter((token) => BigInt(token.balance) !== 0n)

        // 2. Fetch the native balance from Alchemy.
        const nativeData = await alchemyRpcCall<AlchemyNativeBalanceResponse>(
            rpcUrl,
            'eth_getBalance',
            [walletAddress],
        )

        const nativeAsset: NativeAsset = {
            balance: nativeData.result,
            priceCents: 0,
            priceChange24h: 0,
            decimals: 18,
            imageUrl: '',
            holdingValueCents: 0,
        }

        // 3. Update token pricing using CoinGecko.
        const updatedTokens = await hydrateWalletAssets(coinGeckoIdentifier, tokens, env)

        // Return the complete wallet assets object.
        return {
            chain,
            coinGeckoIdentifier,
            walletAddress,
            nativeAsset,
            tokens: updatedTokens,
        }
    } catch (error) {
        console.error('Error fetching wallet assets:', error)
        throw error
    }
}
