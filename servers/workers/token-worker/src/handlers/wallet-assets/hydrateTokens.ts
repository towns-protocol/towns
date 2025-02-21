import { z } from 'zod'
import { ChainWalletAssets } from './walletAssetsModels'
import { Env } from '../../types'

type CodexFilterToken = {
    marketCap: string
    priceUSD: string
    change24: string
    token: {
        id: string
        address: string
        decimals: number
        name: string
        networkId: number
        symbol: string
        info: {
            imageSmallUrl?: string | null
            imageThumbUrl?: string | null
        }
    }
}

type CodexFilterTokensResponse = {
    data: {
        filterTokens: {
            results: CodexFilterToken[]
        }
    }
}

const zCodexFilterTokensResponse: z.ZodType<CodexFilterTokensResponse> = z.object({
    data: z.object({
        filterTokens: z.object({
            results: z.array(
                z.object({
                    marketCap: z.string(),
                    priceUSD: z.string(),
                    change24: z.string(),
                    token: z.object({
                        id: z.string(),
                        address: z.string(),
                        decimals: z.number(),
                        name: z.string(),
                        networkId: z.number(),
                        symbol: z.string(),
                        info: z.object({
                            imageSmallUrl: z.string().nullable(),
                            imageThumbUrl: z.string().nullable(),
                        }),
                    }),
                }),
            ),
        }),
    }),
})

export async function hydrateTokens(assets: ChainWalletAssets[], env: Env) {
    const nativeTokenIds = assets.map((asset) => asset.identifier)
    const tokenIds = nativeTokenIds.concat(
        assets.map((asset) => asset.tokens.map((token) => token.identifier)).flat(),
    )

    const API_KEY = env.CODEX_API_KEY
    if (!API_KEY) {
        throw new Error('Missing Codex API key in environment variables.')
    }

    const query = `
    {
        filterTokens(
            tokens: [${tokenIds.map((id) => `"${id}"`).join(',')}]
            limit: 200
        ) {
            results {
                marketCap
                priceUSD
                change24
                token {
                    id
                    address
                    decimals
                    name
                    networkId
                    symbol
                    info {
                        imageSmallUrl
                        imageThumbUrl
                    }
                }
            }
        }
    }
    `
    try {
        const url = 'https://graph.defined.fi/graphql'
        const resp = await fetch(url, {
            method: 'POST',
            headers: { Authorization: `${API_KEY}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ query }),
        })
        const json = await resp.json()
        const parsed = zCodexFilterTokensResponse.parse(json)

        const dataMap: { [tokenId: string]: CodexFilterToken } = {}
        parsed.data.filterTokens.results.forEach((tokenData) => {
            dataMap[tokenData.token.id] = tokenData
        })
        assets = assets.map((asset) => {
            const metadata = dataMap[asset.identifier]
            if (metadata) {
                asset.nativeAsset.priceCents = 100 * Number(metadata.priceUSD)
                asset.nativeAsset.priceChange24h = parseFloat(metadata.change24)
                asset.nativeAsset.decimals = metadata.token.decimals
                asset.nativeAsset.imageUrl =
                    metadata.token.info.imageSmallUrl ?? metadata.token.info.imageThumbUrl ?? ''
            }

            asset.tokens = asset.tokens
                .map((token) => {
                    const metadata = dataMap[token.identifier]
                    if (metadata) {
                        token = {
                            ...token,
                            priceCents: 100 * Number(metadata.priceUSD),
                            priceChange24h: parseFloat(metadata.change24),
                            decimals: metadata.token.decimals,
                            symbol: metadata.token.symbol,
                            name: metadata.token.name,
                            imageUrl:
                                metadata.token.info.imageSmallUrl ??
                                metadata.token.info.imageThumbUrl ??
                                '',
                        }
                    }
                    return token
                })
                .filter(
                    (token) => token.priceCents !== 0 && token.priceCents && token.decimals !== 0,
                )
            return asset
        })
    } catch (error) {
        console.error('Error fetching Codex tokens:', error, query)
    }
    return assets
}
