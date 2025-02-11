import { TokenAsset } from './walletAssetsModels'
import { Env } from '../../types'

interface CoinGeckoTokenAttributes {
    address: string
    name: string
    symbol: string
    image_url: string
    coingecko_coin_id: string
    decimals: number
    total_supply: string
    price_usd: string
    fdv_usd: string
    total_reserve_in_usd: string
    volume_usd: {
        h24: string
    }
    market_cap_usd: string
}

interface CoinGeckoTokenData {
    id: string
    type: string
    attributes: CoinGeckoTokenAttributes
}

interface CoinGeckoMultiTokenResponse {
    data: CoinGeckoTokenData[]
    included: CoinGeckoPoolData[]
}

interface CoinGeckoPoolPriceChangePercentage {
    h24: string
}

interface CoinGeckoPoolAttributes {
    price_change_percentage: CoinGeckoPoolPriceChangePercentage
}

interface CoinGeckoPoolRelationships {
    base_token: {
        data: {
            id: string
            type: string
        }
    }
}

interface CoinGeckoPoolData {
    id: string
    type: string
    attributes: CoinGeckoPoolAttributes
    relationships: CoinGeckoPoolRelationships
}

export async function hydrateWalletAssets(
    networkId: string,
    tokens: TokenAsset[],
    env: Env,
): Promise<TokenAsset[]> {
    if (tokens.length === 0) {
        return tokens
    }

    const COINGECKO_API_KEY = env.COINGECKO_API_KEY
    if (!COINGECKO_API_KEY) {
        throw new Error('Missing CoinGecko API key in environment variables.')
    }

    if (networkId === 'matic-network') {
        networkId = 'polygon_pos'
    }

    // CoinGeckos's api will only accept 30 tokens
    const chunkSize = 30
    const chunks: TokenAsset[][] = []
    for (let i = 0; i < tokens.length; i += chunkSize) {
        const chunk = tokens.slice(i, i + chunkSize)
        chunks.push(chunk)
    }

    const updatedTokens = await Promise.all(
        chunks.map(async (chunk) => {
            const addresses = chunk.map((token) => token.tokenAddress)
            const joined = addresses.join(',')
            const url = `https://pro-api.coingecko.com/api/v3/onchain/networks/${networkId}/tokens/multi/${joined}?x_cg_pro_api_key=${COINGECKO_API_KEY}&include=top_pools`

            try {
                const response = await fetch(url, {
                    headers: { accept: 'application/json' },
                })

                const coinGeckoResponse = (await response.json()) as CoinGeckoMultiTokenResponse
                const coinGeckoTokens = coinGeckoResponse.data
                const poolData = coinGeckoResponse.included

                // Build a mapping from token address to its CoinGecko data.
                const cgDataMap: { [address: string]: CoinGeckoTokenData } = {}
                coinGeckoTokens.forEach((tokenData) => {
                    cgDataMap[tokenData.id] = tokenData
                })

                const cgPoolDataMap: { [address: string]: CoinGeckoPoolData } = {}
                poolData.forEach((poolData) => {
                    cgPoolDataMap[poolData.relationships.base_token.data.id] = poolData
                })

                // Update each token asset with data from CoinGecko.
                const updatedTokens = chunk
                    .map((token) => {
                        // the key is networkId_tokenAddress, like eth_0x1234
                        const key = `${networkId}_${token.tokenAddress}`
                        const cgData = cgDataMap[key]
                        if (cgData) {
                            token.symbol = cgData.attributes.symbol
                            token.name = cgData.attributes.name
                            token.priceCents = (parseFloat(cgData.attributes.price_usd) ?? 0) * 100
                            token.imageUrl = cgData.attributes.image_url ?? ''
                            token.decimals = cgData.attributes.decimals
                        }
                        const poolData = cgPoolDataMap[key]
                        if (poolData) {
                            token.priceChange24h = parseFloat(
                                poolData.attributes.price_change_percentage.h24,
                            )
                        }
                        return token
                    })
                    .filter(
                        (token) =>
                            token.priceCents !== 0 && token.priceCents && token.decimals !== 0,
                    )

                return updatedTokens
            } catch (error) {
                console.error('Error fetching CoinGecko token info:', error)
                return tokens
            }
        }),
    )
    return updatedTokens.flat()
}
