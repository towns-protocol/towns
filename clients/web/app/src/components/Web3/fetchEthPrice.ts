import { z } from 'zod'
import { env } from 'utils'

const alchemySchema = z.object({
    data: z.array(
        z.object({
            symbol: z.string(),
            prices: z.array(
                z.object({
                    value: z.string(),
                    currency: z.string(),
                    lastUpdatedAt: z.string(),
                }),
            ),
        }),
    ),
})

const etherscanSchema = z.object({
    status: z.string(),
    message: z.string(),
    result: z.object({
        ethusd: z.string(),
        ethbtc: z.string(),
        ethusd_timestamp: z.string(),
    }),
})

async function fetchEthPriceFromAlchemy(priceApiUrl: string) {
    const response = await fetch(`${priceApiUrl}/tokens/by-symbol?symbols=ETH`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    })

    const data = await response.json()
    const parsed = alchemySchema.safeParse(data)

    if (!parsed.success) {
        throw new Error(`Failed to fetch ETH price from Alchemy, zod parse failed: ${parsed.error}`)
    }

    const priceInUsd = parsed.data.data[0].prices[0].value
    return priceInUsd
}

async function fetchEthPriceFromEtherscan(priceApiUrl: string) {
    // Extract API key from URL if present
    const url = new URL(priceApiUrl)
    const apiKey = url.searchParams.get('apikey')
    if (!apiKey) {
        throw new Error('Etherscan API key must be included in the URL as apikey parameter')
    }

    // Remove apikey from base URL if present
    url.searchParams.delete('apikey')
    const baseUrl = url.toString().replace(/\?$/, '')

    const response = await fetch(`${baseUrl}?module=stats&action=ethprice&apikey=${apiKey}`, {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
    })

    const data = await response.json()
    const parsed = etherscanSchema.safeParse(data)

    if (!parsed.success) {
        throw new Error(
            `Failed to fetch ETH price from Etherscan, zod parse failed: ${parsed.error}`,
        )
    }

    return parsed.data.result.ethusd
}

export async function fetchEthPrice() {
    const priceApiUrl = env.VITE_TOKEN_PRICES_API_URL
    if (!priceApiUrl) {
        throw new Error('fetchEthPrice: VITE_TOKEN_PRICES_API_URL is not set')
    }

    const isEtherscan = priceApiUrl.includes('etherscan.io')

    try {
        if (isEtherscan) {
            return await fetchEthPriceFromEtherscan(priceApiUrl)
        } else {
            return await fetchEthPriceFromAlchemy(priceApiUrl)
        }
    } catch (error) {
        console.error(`Failed to fetch ETH price: ${error}`)
        throw error
    }
}
