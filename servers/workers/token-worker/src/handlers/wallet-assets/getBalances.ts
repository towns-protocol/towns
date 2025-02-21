import { z } from 'zod'
import { Env } from '../../types'
import { ChainWalletAssets } from './walletAssetsModels'

type CodexBalancesResponse = {
    data: {
        balances: {
            cursor?: string | null
            items: {
                tokenId: string
                balance: string
                shiftedBalance: number
            }[]
        }
    }
}

const zCodexBalancesResponse: z.ZodType<CodexBalancesResponse> = z.object({
    data: z.object({
        balances: z.object({
            cursor: z.string().nullable(),
            items: z.array(
                z.object({
                    tokenId: z.string(),
                    balance: z.string(),
                    shiftedBalance: z.number(),
                }),
            ),
        }),
    }),
})

function nativeTokenToTokenId(chain: string) {
    switch (chain) {
        case 'solana-mainnet':
            return 'So11111111111111111111111111111111111111112:1399811149'
        case '8453':
            return '0x4200000000000000000000000000000000000006:8453'
        default:
            throw new Error('Unknown chain')
    }
}

function codexChainId(chain: string) {
    switch (chain) {
        case 'solana-mainnet':
            return '1399811149'
        default:
            return chain
    }
}

export async function getBalances(env: Env, walletAddress: string, chain: string) {
    const API_KEY = env.CODEX_API_KEY
    if (!API_KEY) {
        throw new Error('Missing Codex API key in environment variables.')
    }
    const chainId = codexChainId(chain)
    const query = `
        query Balances {
            balances(input: { 
                walletId: "${walletAddress}:${chainId}", 
                cursor: null
                includeNative:true
            }) {
                cursor
                items {
                    tokenId
                    balance
                    shiftedBalance
                }
            }
        }
    `
    const url = 'https://graph.defined.fi/graphql'
    const resp = await fetch(url, {
        method: 'POST',
        headers: { Authorization: `${API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
    })

    const asset: ChainWalletAssets = {
        nativeAsset: {
            balance: '0',
            priceCents: 0,
            priceChange24h: 0,
            holdingValueCents: 0,
            decimals: 18,
        },
        walletAddress: walletAddress,
        chain: chain,
        tokens: [],
        identifier: nativeTokenToTokenId(chain),
    }

    try {
        const balances = zCodexBalancesResponse.parse(await resp.json())
        for (const balance of balances.data.balances.items) {
            if (balance.tokenId === `native:${chainId}`) {
                asset.nativeAsset.balance = balance.balance
            } else {
                asset.tokens.push({
                    chain,
                    tokenAddress: balance.tokenId.split(':')[0],
                    symbol: '',
                    name: '',
                    balance: balance.balance,
                    holdingValueCents: 0,
                    decimals: 18,
                    imageUrl: '',
                    priceCents: 0,
                    priceChange24h: 0,
                    identifier: balance.tokenId,
                })
            }
        }
    } catch (error) {
        console.error('Error fetching Codex balances:', error)
    }
    return asset
}
